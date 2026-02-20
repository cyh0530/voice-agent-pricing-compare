import type { StackConfig, CostBreakdown, CostDetail, ChartPoint } from '@/data/types';
import {
  LIVEKIT_PLANS,
  type LiveKitPlan,
  LIVEKIT_STT,
  LIVEKIT_TTS,
  LIVEKIT_LLM,
  LIVEKIT_S2S,
  PIPECAT_HOSTING,
  MINUTES_PER_MONTH,
  PIPECAT_CAPACITY_PLANNING,
  KRISP_VIVA,
  DAILY_KRISP_ADDON,
  PIPECAT_RECORDING,
  AZURE_BLOB_STORAGE,
  DAILY_TIERS,
  DIRECT_STT,
  DIRECT_TTS,
  DIRECT_LLM,
  DIRECT_S2S,
  AZURE_AKS,
  ASSUMPTIONS,
  type ProviderTier,
  CARTESIA_TIERS,
  ELEVENLABS_TURBO_TIERS,
  DEEPGRAM_STT_PLANS,
} from '@/data/pricing';

// ─── Main Entry Point ─────────────────────────────────────

export function calculateCost(stack: StackConfig, monthlyMinutes: number): CostBreakdown {
  const details: CostDetail[] = [];
  const warnings: string[] = [];

  let platform = 0;
  let transport = 0;
  let noiseCancellation = 0;
  let stt = 0;
  let llm = 0;
  let tts = 0;
  let recording = 0;
  const bestPlans: Record<string, string> = {};

  const isSpeechToSpeech = stack.pipeline === 'speech-to-speech';

  // ── Platform + Transport ──

  if (stack.platform === 'livekit' && stack.hosting === 'cloud') {
    // Evaluate each plan's full cost (platform + WebRTC + observability + recording + inference)
    const result = calcLiveKitCloudOptimal(stack, monthlyMinutes, isSpeechToSpeech, details);
    platform = result.platform;
    transport = result.transport;
    Object.assign(bestPlans, result.bestPlans);
    stt = result.stt;
    llm = result.llm;
    tts = result.tts;
    recording = result.recording;
  } else if (stack.platform === 'pipecat' && stack.hosting === 'cloud') {
    // Active: billed per active session minute
    const activeCost = monthlyMinutes * PIPECAT_HOSTING.agent1x.activePerMin;
    details.push({
      category: 'Platform',
      label: 'Pipecat Agent-1x (active)',
      formula: `${monthlyMinutes.toLocaleString()} min × $${PIPECAT_HOSTING.agent1x.activePerMin}/min`,
      amount: activeCost,
    });

    // Reserved: auto-sized min-agents running 24/7 for capacity headroom.
    // Formula: Optimal Reserved = MAX(Baseline, CPS × Idle Creation Delay)
    //   Baseline = avg concurrent sessions = monthlyMinutes / 43,200
    //   CPS ≈ peak concurrent / avg session duration in seconds
    //   Peak concurrent ≈ baseline × peak-to-avg ratio
    const R = calcOptimalReserved(monthlyMinutes);
    const reservedCost = R * PIPECAT_HOSTING.agent1x.reservedPerMin * MINUTES_PER_MONTH;
    details.push({
      category: 'Platform',
      label: 'Pipecat Agent-1x (reserved)',
      formula: `${R} min-agent${R !== 1 ? 's' : ''} × $${PIPECAT_HOSTING.agent1x.reservedPerMin}/min × ${MINUTES_PER_MONTH.toLocaleString()} min/mo`,
      amount: reservedCost,
    });

    platform = activeCost + reservedCost;

    transport = 0;
    details.push({ category: 'Transport', label: 'Daily WebRTC Voice (1:1 free)', formula: 'Free on Pipecat Cloud', amount: 0 });

    if (isSpeechToSpeech) {
      const s2sRate = DIRECT_S2S[stack.speechToSpeechModel];
      if (s2sRate) {
        const s2sCost = monthlyMinutes * s2sRate.perMinute;
        llm = s2sCost;
        details.push({ category: 'S2S Model', label: stack.speechToSpeechModel, formula: `${monthlyMinutes} min × $${s2sRate.perMinute}/min`, amount: s2sCost });
      }
    } else {
      const inf = calcDirectInference(stack, monthlyMinutes, details, bestPlans);
      stt = inf.stt; llm = inf.llm; tts = inf.tts;
    }
  } else if (stack.hosting === 'self-hosted') {
    // Azure hosting cost (folded into platform)
    const hostingResult = calcAzureHosting(monthlyMinutes, details);
    platform = hostingResult.cost;

    if (stack.platform === 'pipecat') {
      // Self-hosted Pipecat still needs Daily WebRTC transport
      transport = calcDailyTransport(monthlyMinutes, stack.callMode, details);
    } else {
      // Self-hosted LiveKit: open-source server, no transport cost (you host it)
      transport = 0;
      details.push({ category: 'Transport', label: 'LiveKit Server (self-hosted)', formula: 'Included in Azure compute', amount: 0 });
    }

    if (isSpeechToSpeech) {
      const s2sRate = DIRECT_S2S[stack.speechToSpeechModel];
      if (s2sRate) {
        const s2sCost = monthlyMinutes * s2sRate.perMinute;
        llm = s2sCost;
        details.push({ category: 'S2S Model', label: stack.speechToSpeechModel, formula: `${monthlyMinutes} min × $${s2sRate.perMinute}/min`, amount: s2sCost });
      }
    } else {
      const inf = calcDirectInference(stack, monthlyMinutes, details, bestPlans);
      stt = inf.stt; llm = inf.llm; tts = inf.tts;
    }
  }

  // ── Noise Cancellation (Krisp) ──

  noiseCancellation = calcNoiseCancellation(stack, monthlyMinutes, details);

  // ── Recording (non-LiveKit Cloud; LiveKit Cloud recording handled by plan optimizer) ──

  if (!(stack.platform === 'livekit' && stack.hosting === 'cloud')) {
    recording = calcRecording(stack, monthlyMinutes, details);
  }

  const total = platform + transport + noiseCancellation + stt + llm + tts + recording;

  // Auto-resolve pricing source URLs for popover verification links
  for (const detail of details) {
    if (!detail.sourceUrl) {
      detail.sourceUrl = resolveSourceUrl(detail);
    }
  }

  return { platform, transport, noiseCancellation, stt, llm, tts, recording, total, details, bestPlans, warnings };
}

// ─── LiveKit Cloud Plan Optimizer ─────────────────────────
// Evaluates full cost per plan: base fee + agent overage + WebRTC overage +
// observability overage + recording transcode + inference (minus credits).
// Source: https://livekit.io/pricing

function calcPlanFullCost(
  plan: LiveKitPlan,
  stack: StackConfig,
  minutes: number,
  isSpeechToSpeech: boolean,
): number {
  // Agent session overage
  const agentOverage = Math.max(0, minutes - plan.includedAgentMinutes) * plan.agentMinuteRate;

  // WebRTC participant minutes (1:1 voice = same as agent minutes)
  const webRtcOverage = Math.max(0, minutes - plan.includedWebRtcMinutes) * plan.webRtcOverageRate;

  // Observability (assume all sessions are recorded for observability)
  const obsOverage = Math.max(0, minutes - plan.includedObservabilityMinutes) * plan.observabilityOverageRate;

  // Recording transcode + Azure Blob Storage (only when recording is enabled)
  let recordingCost = 0;
  if (stack.recordingMode !== 'none') {
    const rate = stack.recordingMode === 'audio-only' ? plan.transcodeAudioRate : plan.transcodeVideoRate;
    const transcodeOverage = Math.max(0, minutes - plan.includedTranscodeMinutes);
    recordingCost = transcodeOverage * rate;

    const mbPerMin = stack.recordingMode === 'audio-only'
      ? AZURE_BLOB_STORAGE.audioMBPerMinute
      : AZURE_BLOB_STORAGE.videoMBPerMinute;
    recordingCost += (minutes * mbPerMin / 1024) * AZURE_BLOB_STORAGE.perGBMonth;
  }

  // Downstream data transfer
  const totalGB = (minutes * ASSUMPTIONS.avgDownstreamMBPerMinute) / 1024;
  const dataTransferOverage = Math.max(0, totalGB - plan.includedDataTransferGB) * plan.dataTransferOveragePerGB;

  // Inference
  let inferenceCost = 0;
  if (isSpeechToSpeech) {
    const s2sRate = LIVEKIT_S2S[stack.speechToSpeechModel];
    if (s2sRate) inferenceCost = minutes * s2sRate.perMinute;
  } else {
    const isScale = plan.name === 'Scale';
    inferenceCost += calcLiveKitSttCost(stack.sttModel, minutes, isScale);
    inferenceCost += calcLiveKitLlmCost(stack.llmModel, minutes);
    inferenceCost += calcLiveKitTtsCost(stack.ttsModel, minutes, isScale);
  }

  // Subtract included inference credits
  inferenceCost = Math.max(0, inferenceCost - plan.includedInferenceCredits);

  return plan.monthlyFee + agentOverage + webRtcOverage + obsOverage + recordingCost + dataTransferOverage + inferenceCost;
}

function calcLiveKitCloudOptimal(
  stack: StackConfig,
  minutes: number,
  isSpeechToSpeech: boolean,
  details: CostDetail[]
): { platform: number; transport: number; recording: number; stt: number; llm: number; tts: number; bestPlans: Record<string, string> } {
  // Pick cheapest plan by total cost
  let bestTotal = Infinity;
  let bestPlanName = LIVEKIT_PLANS[0].name;

  for (const plan of LIVEKIT_PLANS) {
    const total = calcPlanFullCost(plan, stack, minutes, isSpeechToSpeech);
    if (total < bestTotal) {
      bestTotal = total;
      bestPlanName = plan.name;
    }
  }

  // Compute and detail each cost line for the chosen plan
  const plan = LIVEKIT_PLANS.find((p) => p.name === bestPlanName)!;
  const isScale = bestPlanName === 'Scale';

  // Platform: base fee + agent overage
  const agentOverage = Math.max(0, minutes - plan.includedAgentMinutes);
  const platformBase = plan.monthlyFee + agentOverage * plan.agentMinuteRate;
  details.push({
    category: 'Platform',
    label: `LiveKit ${bestPlanName} plan`,
    formula: `$${plan.monthlyFee}/mo base + ${agentOverage > 0 ? `${agentOverage} overage min × $${plan.agentMinuteRate}/min` : 'no overage'}`,
    amount: platformBase,
  });

  // WebRTC participant minutes
  const webRtcOverage = Math.max(0, minutes - plan.includedWebRtcMinutes);
  const webRtcCost = webRtcOverage * plan.webRtcOverageRate;
  details.push({
    category: 'Transport',
    label: 'WebRTC participant minutes',
    formula: webRtcOverage > 0
      ? `(${minutes.toLocaleString()} − ${plan.includedWebRtcMinutes.toLocaleString()} included) × $${plan.webRtcOverageRate}/min`
      : `${minutes.toLocaleString()} min within ${plan.includedWebRtcMinutes.toLocaleString()} included`,
    amount: webRtcCost,
  });

  // Observability
  const obsOverage = Math.max(0, minutes - plan.includedObservabilityMinutes);
  const obsCost = obsOverage * plan.observabilityOverageRate;
  if (obsCost > 0) {
    details.push({
      category: 'Platform',
      label: 'Observability overage',
      formula: `(${minutes.toLocaleString()} − ${plan.includedObservabilityMinutes.toLocaleString()} included) × $${plan.observabilityOverageRate}/min`,
      amount: obsCost,
    });
  }

  // Downstream data transfer
  const totalGB = (minutes * ASSUMPTIONS.avgDownstreamMBPerMinute) / 1024;
  const dataTransferOverageGB = Math.max(0, totalGB - plan.includedDataTransferGB);
  const dataTransferCost = dataTransferOverageGB * plan.dataTransferOveragePerGB;
  if (dataTransferCost > 0) {
    details.push({
      category: 'Transport',
      label: 'Downstream data transfer',
      formula: `(${totalGB.toFixed(1)}GB − ${plan.includedDataTransferGB}GB included) × $${plan.dataTransferOveragePerGB}/GB`,
      amount: dataTransferCost,
    });
  }

  // Recording transcode + Azure Blob Storage
  let recordingCost = 0;
  if (stack.recordingMode !== 'none') {
    const rate = stack.recordingMode === 'audio-only' ? plan.transcodeAudioRate : plan.transcodeVideoRate;
    const transcodeOverage = Math.max(0, minutes - plan.includedTranscodeMinutes);
    const transcodeCost = transcodeOverage * rate;
    details.push({
      category: 'Recording',
      label: `Transcode (${stack.recordingMode})`,
      formula: transcodeOverage > 0
        ? `(${minutes.toLocaleString()} − ${plan.includedTranscodeMinutes} included) × $${rate}/min`
        : `${minutes.toLocaleString()} min within ${plan.includedTranscodeMinutes} included`,
      amount: transcodeCost,
    });

    const mbPerMin = stack.recordingMode === 'audio-only'
      ? AZURE_BLOB_STORAGE.audioMBPerMinute
      : AZURE_BLOB_STORAGE.videoMBPerMinute;
    const storageGB = (minutes * mbPerMin) / 1024;
    const storageCost = storageGB * AZURE_BLOB_STORAGE.perGBMonth;
    details.push({
      category: 'Recording',
      label: 'Azure Blob Storage (Hot LRS)',
      formula: `${storageGB.toFixed(2)} GB × $${AZURE_BLOB_STORAGE.perGBMonth}/GB/mo`,
      amount: storageCost,
    });

    recordingCost = transcodeCost + storageCost;
  }

  // Inference
  let stt = 0;
  let llm = 0;
  let tts = 0;

  if (isSpeechToSpeech) {
    const s2sRate = LIVEKIT_S2S[stack.speechToSpeechModel];
    if (s2sRate) {
      const s2sCost = minutes * s2sRate.perMinute;
      llm = s2sCost;
      details.push({ category: 'S2S Model', label: stack.speechToSpeechModel, formula: `${minutes} min × $${s2sRate.perMinute}/min`, amount: s2sCost });
    }
  } else {
    stt = calcLiveKitStt(stack.sttModel, minutes, isScale, details);
    llm = calcLiveKitLlm(stack.llmModel, minutes, details);
    tts = calcLiveKitTts(stack.ttsModel, minutes, isScale, details);
  }

  // Apply inference credits
  const rawInference = stt + llm + tts;
  if (plan.includedInferenceCredits > 0 && rawInference > 0) {
    const credit = Math.min(plan.includedInferenceCredits, rawInference);
    details.push({
      category: 'Platform',
      label: 'Inference credits',
      formula: `-$${credit.toFixed(2)} included with ${bestPlanName} plan`,
      amount: -credit,
    });
    // Distribute credit proportionally
    const ratio = (rawInference - credit) / rawInference;
    stt *= ratio;
    llm *= ratio;
    tts *= ratio;
  }

  const totalPlatform = platformBase + obsCost - Math.min(plan.includedInferenceCredits, rawInference);

  const bestPlans: Record<string, string> = { Platform: bestPlanName };
  return { platform: totalPlatform, transport: webRtcCost + dataTransferCost, recording: recordingCost, stt, llm, tts, bestPlans };
}

// Cost-only helpers (no detail push) for plan comparison
function calcLiveKitSttCost(model: string, minutes: number, isScale: boolean): number {
  const rates = LIVEKIT_STT[model];
  if (!rates) return 0;
  const sttMinutes = minutes * ASSUMPTIONS.sttDutyRatio;
  return sttMinutes * (isScale ? rates.scale : rates.buildShip);
}

function calcLiveKitTtsCost(model: string, minutes: number, isScale: boolean): number {
  const rates = LIVEKIT_TTS[model];
  if (!rates) return 0;
  const ttsMinutes = minutes * ASSUMPTIONS.ttsDutyRatio;
  const totalChars = ttsMinutes * ASSUMPTIONS.avgCharsPerMinuteTTS;
  return (totalChars / 1_000_000) * (isScale ? rates.scale : rates.buildShip);
}

function calcLiveKitLlmCost(model: string, minutes: number): number {
  const rates = LIVEKIT_LLM[model];
  if (!rates) return 0;
  const totalInput = minutes * ASSUMPTIONS.avgInputTokensPerMinute;
  const cachedInput = totalInput * ASSUMPTIONS.cacheHitRate;
  const freshInput = totalInput - cachedInput;
  const totalOutput = minutes * ASSUMPTIONS.avgOutputTokensPerMinute;
  return (freshInput / 1_000_000) * rates.input + (cachedInput / 1_000_000) * rates.cachedInput + (totalOutput / 1_000_000) * rates.output;
}

// ─── LiveKit Inference Costs ──────────────────────────────

function calcLiveKitStt(model: string, minutes: number, isScale: boolean, details: CostDetail[]): number {
  const rates = LIVEKIT_STT[model];
  if (!rates) return 0;
  const rate = isScale ? rates.scale : rates.buildShip;
  const sttMinutes = minutes * ASSUMPTIONS.sttDutyRatio;
  const cost = sttMinutes * rate;
  details.push({ category: 'STT', label: model, formula: `${minutes} min × ${ASSUMPTIONS.sttDutyRatio * 100}% duty × $${rate}/min${isScale ? ' (Scale)' : ''}`, amount: cost });
  return cost;
}

function calcLiveKitTts(model: string, minutes: number, isScale: boolean, details: CostDetail[]): number {
  const rates = LIVEKIT_TTS[model];
  if (!rates) return 0;
  const rate = isScale ? rates.scale : rates.buildShip;
  const ttsMinutes = minutes * ASSUMPTIONS.ttsDutyRatio;
  const totalChars = ttsMinutes * ASSUMPTIONS.avgCharsPerMinuteTTS;
  const cost = (totalChars / 1_000_000) * rate;
  details.push({
    category: 'TTS',
    label: model,
    formula: `${minutes} min × ${ASSUMPTIONS.ttsDutyRatio * 100}% duty × ${ASSUMPTIONS.avgCharsPerMinuteTTS} chars/min ÷ 1M × $${rate}/M chars${isScale ? ' (Scale)' : ''}`,
    amount: cost,
  });
  return cost;
}

function calcLiveKitLlm(model: string, minutes: number, details: CostDetail[]): number {
  const rates = LIVEKIT_LLM[model];
  if (!rates) return 0;
  const totalInput = minutes * ASSUMPTIONS.avgInputTokensPerMinute;
  const cachedInput = totalInput * ASSUMPTIONS.cacheHitRate;
  const freshInput = totalInput - cachedInput;
  const totalOutput = minutes * ASSUMPTIONS.avgOutputTokensPerMinute;

  const inputCost = (freshInput / 1_000_000) * rates.input;
  const cachedCost = (cachedInput / 1_000_000) * rates.cachedInput;
  const outputCost = (totalOutput / 1_000_000) * rates.output;
  const cost = inputCost + cachedCost + outputCost;

  details.push({
    category: 'LLM',
    label: model,
    formula: `Input: ${(freshInput / 1000).toFixed(0)}K tok × $${rates.input}/M + Cached: ${(cachedInput / 1000).toFixed(0)}K × $${rates.cachedInput}/M + Output: ${(totalOutput / 1000).toFixed(0)}K × $${rates.output}/M`,
    amount: cost,
  });
  return cost;
}

// ─── Direct Provider Costs ────────────────────────────────

function calcDirectStt(model: string, minutes: number, details: CostDetail[]): number {
  const rate = DIRECT_STT[model];
  if (!rate) return 0;
  const sttMinutes = minutes * ASSUMPTIONS.sttDutyRatio;
  const cost = sttMinutes * rate;
  details.push({ category: 'STT', label: model, formula: `${minutes} min × ${ASSUMPTIONS.sttDutyRatio * 100}% duty × $${rate}/min (direct)`, amount: cost });
  return cost;
}

function calcDirectTts(model: string, minutes: number, details: CostDetail[]): number {
  const rate = DIRECT_TTS[model];
  if (!rate) return 0;
  const ttsMinutes = minutes * ASSUMPTIONS.ttsDutyRatio;
  const totalChars = ttsMinutes * ASSUMPTIONS.avgCharsPerMinuteTTS;
  const cost = (totalChars / 1_000_000) * rate;
  details.push({
    category: 'TTS',
    label: model,
    formula: `${minutes} min × ${ASSUMPTIONS.ttsDutyRatio * 100}% duty × ${ASSUMPTIONS.avgCharsPerMinuteTTS} chars/min ÷ 1M × $${rate}/M chars (direct)`,
    amount: cost,
  });
  return cost;
}

function calcDirectLlm(model: string, minutes: number, details: CostDetail[]): number {
  const rates = DIRECT_LLM[model];
  if (!rates) return 0;
  const totalInput = minutes * ASSUMPTIONS.avgInputTokensPerMinute;
  const totalOutput = minutes * ASSUMPTIONS.avgOutputTokensPerMinute;
  const inputCost = (totalInput / 1_000_000) * rates.input;
  const outputCost = (totalOutput / 1_000_000) * rates.output;
  const cost = inputCost + outputCost;
  details.push({
    category: 'LLM',
    label: model,
    formula: `Input: ${(totalInput / 1000).toFixed(0)}K tok × $${rates.input}/M + Output: ${(totalOutput / 1000).toFixed(0)}K × $${rates.output}/M (direct)`,
    amount: cost,
  });
  return cost;
}

// ─── Provider Tier Optimizer ──────────────────────────────
// Evaluates each subscription tier and picks the cheapest option
// that can serve the required usage (with overage where allowed).

interface TierResult {
  tier: ProviderTier;
  cost: number;
  overage: number;
}

function optimizeTier(tiers: ProviderTier[], unitsNeeded: number): TierResult | null {
  if (unitsNeeded <= 0) return { tier: tiers[0], cost: 0, overage: 0 };

  let best: TierResult | null = null;

  for (const tier of tiers) {
    let cost: number;
    let overage = 0;

    if (unitsNeeded <= tier.includedUnits) {
      cost = tier.monthlyFee;
    } else if (tier.overageRate > 0) {
      overage = unitsNeeded - tier.includedUnits;
      cost = tier.monthlyFee + overage * tier.overageRate;
    } else {
      continue; // can't cover usage, skip this tier
    }

    if (best === null || cost < best.cost) {
      best = { tier, cost, overage };
    }
  }

  return best;
}

function fmtUnits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

// ─── Tier-Aware Direct Inference ─────────────────────────
// Handles Cartesia shared credit pool and ElevenLabs tiered TTS.
// Falls back to flat-rate calcDirectStt/calcDirectTts for other providers.

function calcDirectInference(
  stack: StackConfig,
  minutes: number,
  details: CostDetail[],
  bestPlans: Record<string, string>,
): { stt: number; llm: number; tts: number } {
  const llm = calcDirectLlm(stack.llmModel, minutes, details);

  const isCartesiaStt = stack.sttModel === 'cartesia-ink-whisper';
  const isCartesiaTts = stack.ttsModel === 'cartesia-sonic-3';
  const isElevenLabsTts = stack.ttsModel === 'elevenlabs-turbo-v2.5';
  const isDeepgramStt = stack.sttModel.startsWith('deepgram-');

  let stt = 0;
  let tts = 0;

  // Cartesia: shared credit pool between STT and TTS
  if (isCartesiaStt || isCartesiaTts) {
    const sttMinutes = minutes * ASSUMPTIONS.sttDutyRatio;
    const sttCredits = isCartesiaStt ? sttMinutes * 60 : 0;
    const ttsChars = minutes * ASSUMPTIONS.ttsDutyRatio * ASSUMPTIONS.avgCharsPerMinuteTTS;
    const ttsCredits = isCartesiaTts ? ttsChars : 0;
    const totalCredits = sttCredits + ttsCredits;

    if (totalCredits > 0) {
      const result = optimizeTier(CARTESIA_TIERS, totalCredits);
      if (result) {
        const { tier, cost, overage } = result;
        const overageSuffix = overage > 0
          ? ` + ${fmtUnits(overage)} overage × $${tier.overageRate}/credit`
          : '';

        if (isCartesiaStt && isCartesiaTts) {
          const sttShare = sttCredits / totalCredits;
          stt = cost * sttShare;
          tts = cost * (1 - sttShare);
          bestPlans['STT'] = `Cartesia ${tier.name}`;
          bestPlans['TTS'] = `Cartesia ${tier.name}`;

          details.push({
            category: 'STT',
            label: `Cartesia Ink Whisper (${tier.name})`,
            formula: `${fmtUnits(sttCredits)} of ${fmtUnits(totalCredits)} shared credits → ${(sttShare * 100).toFixed(0)}% of ${tier.name} $${tier.monthlyFee}/mo${overageSuffix}`,
            amount: stt,
          });
          details.push({
            category: 'TTS',
            label: `Cartesia Sonic 3 (${tier.name})`,
            formula: `${fmtUnits(ttsCredits)} of ${fmtUnits(totalCredits)} shared credits → ${((1 - sttShare) * 100).toFixed(0)}% of ${tier.name} $${tier.monthlyFee}/mo${overageSuffix}`,
            amount: tts,
          });
        } else if (isCartesiaStt) {
          stt = cost;
          bestPlans['STT'] = `Cartesia ${tier.name}`;
          details.push({
            category: 'STT',
            label: `Cartesia Ink Whisper (${tier.name})`,
            formula: `${fmtUnits(sttCredits)} credits → ${tier.name} $${tier.monthlyFee}/mo (${fmtUnits(tier.includedUnits)} included)${overageSuffix}`,
            amount: stt,
          });
        } else {
          tts = cost;
          bestPlans['TTS'] = `Cartesia ${tier.name}`;
          details.push({
            category: 'TTS',
            label: `Cartesia Sonic 3 (${tier.name})`,
            formula: `${fmtUnits(ttsCredits)} credits → ${tier.name} $${tier.monthlyFee}/mo (${fmtUnits(tier.includedUnits)} included)${overageSuffix}`,
            amount: tts,
          });
        }
      }
    }

    if (!isCartesiaStt) {
      stt = isDeepgramStt
        ? calcDeepgramStt(stack.sttModel, minutes, details, bestPlans)
        : calcDirectStt(stack.sttModel, minutes, details);
    }
    if (!isCartesiaTts) {
      if (isElevenLabsTts) {
        tts = calcElevenLabsTts(minutes, details, bestPlans);
      } else {
        tts = calcDirectTts(stack.ttsModel, minutes, details);
      }
    }
  } else {
    stt = isDeepgramStt
      ? calcDeepgramStt(stack.sttModel, minutes, details, bestPlans)
      : calcDirectStt(stack.sttModel, minutes, details);

    if (isElevenLabsTts) {
      tts = calcElevenLabsTts(minutes, details, bestPlans);
    } else {
      tts = calcDirectTts(stack.ttsModel, minutes, details);
    }
  }

  return { stt, llm, tts };
}

function calcElevenLabsTts(minutes: number, details: CostDetail[], bestPlans: Record<string, string>): number {
  const ttsMinutes = minutes * ASSUMPTIONS.ttsDutyRatio;
  const totalChars = ttsMinutes * ASSUMPTIONS.avgCharsPerMinuteTTS;

  const result = optimizeTier(ELEVENLABS_TURBO_TIERS, totalChars);
  if (!result) return 0;

  const { tier, cost, overage } = result;
  bestPlans['TTS'] = `ElevenLabs ${tier.name}`;

  let formula = `${fmtUnits(totalChars)} chars → ${tier.name} $${tier.monthlyFee}/mo (${fmtUnits(tier.includedUnits)} included)`;
  if (overage > 0) {
    formula += ` + ${fmtUnits(overage)} overage × $${tier.overageRate}/char`;
  }

  details.push({
    category: 'TTS',
    label: `ElevenLabs Turbo v2.5 (${tier.name})`,
    formula,
    amount: cost,
  });

  return cost;
}

// ─── Deepgram STT Plan Optimizer ─────────────────────────
// Compares Pay As You Go vs Growth ($4K/year minimum commitment).
// Growth has lower per-minute rates but requires a minimum monthly spend
// of $333.33 ($4K ÷ 12). The optimizer picks whichever plan is cheaper.

function calcDeepgramStt(model: string, minutes: number, details: CostDetail[], bestPlans: Record<string, string>): number {
  const sttMinutes = minutes * ASSUMPTIONS.sttDutyRatio;

  let bestPlanName = '';
  let bestCost = Infinity;

  for (const plan of DEEPGRAM_STT_PLANS) {
    const rate = plan.rates[model];
    if (rate === undefined) continue;
    const usageCost = sttMinutes * rate;
    const monthlyMin = plan.minAnnualCommitment / 12;
    const cost = Math.max(monthlyMin, usageCost);
    if (cost < bestCost) {
      bestCost = cost;
      bestPlanName = plan.name;
    }
  }

  if (!bestPlanName) return 0;
  bestPlans['STT'] = `Deepgram ${bestPlanName}`;

  const chosenPlan = DEEPGRAM_STT_PLANS.find(p => p.name === bestPlanName)!;
  const rate = chosenPlan.rates[model]!;
  const usageCost = sttMinutes * rate;
  const monthlyMin = chosenPlan.minAnnualCommitment / 12;
  const hitsMinimum = chosenPlan.minAnnualCommitment > 0 && usageCost < monthlyMin;

  let formula: string;
  if (hitsMinimum) {
    formula = `${minutes} min × ${ASSUMPTIONS.sttDutyRatio * 100}% duty × $${rate}/min = $${usageCost.toFixed(2)}, but ${bestPlanName} min $${monthlyMin.toFixed(0)}/mo ($${(chosenPlan.minAnnualCommitment / 1000).toFixed(0)}K/yr) (direct)`;
  } else {
    formula = `${minutes} min × ${ASSUMPTIONS.sttDutyRatio * 100}% duty × $${rate}/min (Deepgram ${bestPlanName}) (direct)`;
  }

  details.push({
    category: 'STT',
    label: `${model} (Deepgram ${bestPlanName})`,
    formula,
    amount: bestCost,
  });

  return bestCost;
}

// ─── Daily WebRTC Transport (tiered) ──────────────────────

function calcDailyTransport(minutes: number, callMode: string, details: CostDetail[]): number {
  let remaining = minutes;
  let cost = 0;
  let prevUpTo = 0;

  for (const tier of DAILY_TIERS) {
    const tierSize = tier.upTo - prevUpTo;
    const used = Math.min(remaining, tierSize);
    if (used <= 0) break;
    const rate = callMode === 'audio-only' ? tier.audioOnly : tier.videoAudio;
    cost += used * rate;
    remaining -= used;
    prevUpTo = tier.upTo;
  }

  details.push({
    category: 'Transport',
    label: `Daily WebRTC (${callMode}, tiered)`,
    formula: `${minutes} participant-min with volume discounts`,
    amount: cost,
  });
  return cost;
}

// ─── Azure Hosting ────────────────────────────────────────

function calcAzureHosting(minutes: number, details: CostDetail[]): { cost: number; recommendation: string } {
  const concurrentSessions = Math.ceil(minutes / (30 * 24 * 60)); // rough: minutes spread across a month
  const peakConcurrent = Math.max(1, Math.ceil(concurrentSessions * 2)); // 2x for peak

  const nodes = Math.max(1, Math.ceil(peakConcurrent / AZURE_AKS.concurrentAgentsPerNode));
  const cost = AZURE_AKS.controlPlane + nodes * AZURE_AKS.nodeMonthly;

  details.push({
    category: 'Platform',
    label: 'Azure AKS',
    formula: `Control plane $${AZURE_AKS.controlPlane}/mo + ${nodes} D2s_v3 node${nodes > 1 ? 's' : ''} × $${AZURE_AKS.nodeMonthly}/mo`,
    amount: cost,
  });

  return { cost, recommendation: 'AKS' };
}

// ─── Recording ────────────────────────────────────────────

function calcRecording(stack: StackConfig, minutes: number, details: CostDetail[]): number {
  if (stack.recordingMode === 'none') return 0;

  // Daily recording processing + Azure Blob Storage for recordings
  const processingRate = stack.recordingMode === 'audio-only'
    ? PIPECAT_RECORDING.audioOnly
    : PIPECAT_RECORDING.audioVideo;
  const processingCost = minutes * processingRate;

  const mbPerMin = stack.recordingMode === 'audio-only'
    ? AZURE_BLOB_STORAGE.audioMBPerMinute
    : AZURE_BLOB_STORAGE.videoMBPerMinute;
  const totalGB = (minutes * mbPerMin) / 1024;
  const storageCost = totalGB * AZURE_BLOB_STORAGE.perGBMonth;

  details.push({
    category: 'Recording',
    label: `Daily recording (${stack.recordingMode})`,
    formula: `${minutes} min × $${processingRate}/min`,
    amount: processingCost,
  });
  details.push({
    category: 'Recording',
    label: 'Azure Blob Storage (Hot LRS)',
    formula: `${totalGB.toFixed(2)} GB × $${AZURE_BLOB_STORAGE.perGBMonth}/GB/mo`,
    amount: storageCost,
  });

  return processingCost + storageCost;
}

// ─── Noise Cancellation (Krisp) ───────────────────────────

function calcNoiseCancellation(stack: StackConfig, minutes: number, details: CostDetail[]): number {
  if (stack.platform === 'livekit' && stack.hosting === 'cloud') {
    details.push({ category: 'Noise Cancellation', label: 'Krisp (included)', formula: 'Included with LiveKit Cloud', amount: 0 });
    return 0;
  }

  if (stack.platform === 'pipecat' && stack.hosting === 'cloud') {
    const billable = Math.max(0, minutes - KRISP_VIVA.freeMinutes);
    const cost = billable * KRISP_VIVA.perMinuteAfterFree;
    const formula = minutes <= KRISP_VIVA.freeMinutes
      ? `${minutes} min ≤ ${KRISP_VIVA.freeMinutes.toLocaleString()} free tier`
      : `(${minutes.toLocaleString()} − ${KRISP_VIVA.freeMinutes.toLocaleString()} free) × $${KRISP_VIVA.perMinuteAfterFree}/min`;
    details.push({ category: 'Noise Cancellation', label: 'Krisp VIVA', formula, amount: cost });
    return cost;
  }

  if (stack.platform === 'pipecat' && stack.hosting === 'self-hosted') {
    // Self-hosted Pipecat uses Daily WebRTC, which offers Krisp as an add-on
    const cost = minutes * DAILY_KRISP_ADDON.perParticipantMinute;
    details.push({
      category: 'Noise Cancellation',
      label: 'Krisp via Daily add-on',
      formula: `${minutes} min × $${DAILY_KRISP_ADDON.perParticipantMinute}/min`,
      amount: cost,
    });
    return cost;
  }

  // LiveKit self-hosted: Krisp SDK license required, not included in calculator
  details.push({ category: 'Noise Cancellation', label: 'Krisp SDK (separate license)', formula: 'Contact Krisp for pricing', amount: 0 });
  return 0;
}

// ─── Source URL Resolver ──────────────────────────────────
// Maps each CostDetail to a pricing page URL with :~:text= fragment
// so users can verify rates directly on the provider's website.

function resolveSourceUrl(detail: CostDetail): string | undefined {
  const { category, label, formula } = detail;
  const frag = (text: string) => encodeURIComponent(text);

  // ── LiveKit Cloud Plans ──
  // Verified on livekit.io/pricing: plan names "Ship", "Scale" are exact
  if (label.startsWith('LiveKit Ship'))
    return `https://livekit.io/pricing#:~:text=${frag('Ship')}`;
  if (label.startsWith('LiveKit Scale'))
    return `https://livekit.io/pricing#:~:text=${frag('Scale')}`;
  if (label === 'Inference credits')
    return `https://livekit.io/pricing#:~:text=${frag('Inference credits')}`;
  if (label === 'Observability overage')
    return `https://livekit.io/pricing#:~:text=${frag('observability')}`;
  if (label === 'WebRTC participant minutes')
    return `https://livekit.io/pricing#:~:text=${frag('WebRTC')}`;
  if (label === 'Downstream data transfer')
    return `https://livekit.io/pricing#:~:text=${frag('data transfer')}`;
  if (label.startsWith('Transcode'))
    return `https://livekit.io/pricing#:~:text=${frag('Recording')}`;

  // ── Pipecat Cloud ──
  // Verified on daily.co/pricing/pipecat-cloud: heading is lowercase "agent-1x"
  if (label.startsWith('Pipecat Agent-1x'))
    return `https://www.daily.co/pricing/pipecat-cloud/#:~:text=${frag('agent-1x')}`;
  if (label.includes('Daily WebRTC Voice'))
    return 'https://www.daily.co/pricing/pipecat-cloud/';
  if (label.startsWith('Daily WebRTC ('))
    return 'https://www.daily.co/pricing/webrtc-infrastructure/';
  if (label.startsWith('Daily recording'))
    return `https://www.daily.co/pricing/pipecat-cloud/#:~:text=${frag('Recording')}`;

  // ── Azure ──
  if (label === 'Azure AKS')
    return 'https://azure.microsoft.com/en-us/pricing/details/kubernetes-service/';
  if (label.includes('Azure Blob Storage'))
    return 'https://azure.microsoft.com/en-us/pricing/details/storage/blobs/';

  // ── Noise Cancellation ──
  // Verified: "Krisp" is on livekit.io/pricing, "Krisp VIVA" on pipecat-cloud,
  // "Noise cancellation powered by Krisp" on daily.co/pricing/video-sdk
  if (label === 'Krisp (included)')
    return `https://livekit.io/pricing#:~:text=${frag('Krisp')}`;
  if (label === 'Krisp VIVA')
    return 'https://www.daily.co/pricing/pipecat-cloud/#krisp-viva';
  if (label === 'Krisp via Daily add-on')
    return `https://www.daily.co/pricing/video-sdk/#:~:text=${frag('Noise cancellation powered by Krisp')}`;

  // ── S2S Models ──
  if (category === 'S2S Model') {
    if (label.includes('openai-realtime')) return 'https://openai.com/api/pricing/';
    if (label.includes('gemini-live')) return 'https://ai.google.dev/pricing';
  }

  // ── Tier-Optimized Providers (label includes proper-cased name + tier/plan) ──
  if (label.includes('Cartesia Ink Whisper') || label.includes('Cartesia Sonic 3'))
    return 'https://cartesia.ai/pricing';
  if (label.includes('ElevenLabs Turbo v2.5'))
    return `https://elevenlabs.io/pricing#:~:text=${frag('Flash')}`;
  if (label.includes('Deepgram'))
    return 'https://deepgram.com/pricing';

  // ── LiveKit Inference (label = raw model ID, formula lacks "(direct)") ──
  // Verified on livekit.io/pricing/inference: all model names are exact matches
  if (!formula.includes('(direct)')) {
    const lkFrags: Record<string, string> = {
      'assemblyai-universal-streaming': 'Universal-Streaming',
      'assemblyai-universal-streaming-multilingual': 'Universal-Streaming-Multilingual',
      'cartesia-ink-whisper': 'Ink Whisper',
      'deepgram-nova-3': 'Nova-3 (Monolingual)',
      'deepgram-nova-3-multilingual': 'Nova-3 (Multilingual)',
      'cartesia-sonic-3': 'Sonic 3',
      'elevenlabs-turbo-v2.5': 'Eleven Turbo v2.5',
      'gpt-5.2': 'GPT-5.2',
      'gemini-3-pro': 'Gemini 3 Pro',
      'gemini-3-flash': 'Gemini 3 Flash',
    };
    if (lkFrags[label])
      return `https://livekit.io/pricing/inference#:~:text=${frag(lkFrags[label])}`;
  }

  // ── Direct Provider Pricing (formula contains "(direct)") ──
  if (formula.includes('(direct)')) {
    if (label.startsWith('assemblyai')) return 'https://www.assemblyai.com/pricing';
    if (label.startsWith('deepgram')) return 'https://deepgram.com/pricing';
    if (label.startsWith('gpt')) return 'https://openai.com/api/pricing/';
    if (label.startsWith('gemini')) return 'https://ai.google.dev/pricing';
  }

  return undefined;
}

// ─── Pipecat Reserved Instance Calculator ─────────────────
// Capacity planning formula from docs:
//   Optimal Reserved = MAX(Baseline Sessions, CPS × Idle Creation Delay)
// Baseline = average concurrent sessions derived from monthly minutes.
// CPS = peak call arrival rate, estimated from peak concurrent / avg session duration.

function calcOptimalReserved(monthlyMinutes: number): number {
  if (monthlyMinutes <= 0) return 0;
  const avgConcurrent = monthlyMinutes / MINUTES_PER_MONTH;
  const baseline = avgConcurrent;

  const peakConcurrent = avgConcurrent * ASSUMPTIONS.peakToAvgRatio;
  const avgSessionSec = ASSUMPTIONS.avgSessionMinutes * 60;
  const cps = peakConcurrent / avgSessionSec;
  const burst = cps * PIPECAT_CAPACITY_PLANNING.idleCreationDelaySec;

  return Math.ceil(Math.max(baseline, burst));
}

// ─── Chart Data Generator ─────────────────────────────────

const BASE_CHART_TICKS = [0, 500, 1000, 2000, 5000, 10000, 20000, 50000, 75000, 100000];

function buildChartTicks(maxMinutes: number): number[] {
  if (maxMinutes <= 100000) return BASE_CHART_TICKS;

  const ceiling = maxMinutes * 1.2;
  const candidates = [150000, 200000, 300000, 500000, 750000, 1000000, 1500000, 2000000, 3000000, 5000000, 10000000];
  const extra = candidates.filter((t) => t <= ceiling);
  if (extra.length === 0 || extra[extra.length - 1] < maxMinutes) {
    extra.push(Math.ceil(maxMinutes / 50000) * 50000);
  }
  return [...BASE_CHART_TICKS, ...extra];
}

export function generateChartData(stack: StackConfig, maxMinutes = 100000): ChartPoint[] {
  return buildChartTicks(maxMinutes).map((minutes) => ({
    minutes,
    cost: calculateCost(stack, minutes).total,
  }));
}
