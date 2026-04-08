import type { PricingMeta } from './types';

// ─── Metadata ─────────────────────────────────────────────

export const META: Record<string, PricingMeta> = {
  livekit: {
    sourceUrls: ['https://livekit.io/pricing', 'https://livekit.io/pricing/inference'],
    lastVerifiedAt: '2026-02-17',
    assumptions: [
      'Ship plan: $50/mo, 5K agent min, 150K WebRTC min, 5K observability min, 600 transcode min, $5 inference credits',
      'Scale plan: $500/mo, 50K agent min, 1.5M WebRTC min, 50K observability min, 8K transcode min, $50 inference credits',
      'Build plan excluded (dev-only, 1 agent deployment, 5 concurrent sessions)',
      'Enterprise plan excluded (custom pricing)',
      'S2S rates estimated with ~10% inference margin over direct provider pricing',
    ],
  },
  s2s: {
    sourceUrls: [
      'https://developers.openai.com/api/docs/models/gpt-realtime',
      'https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-native-audio',
    ],
    lastVerifiedAt: '2026-02-17',
    assumptions: [
      'OpenAI gpt-realtime (GA): audio input 10 tok/sec @ $32/1M, output 20 tok/sec @ $64/1M, cached $0.40/1M',
      'Gemini 2.5 Flash Native Audio (Live API): audio ~25 tok/sec (est.), input $3/1M, output $12/1M',
      'Turn-based context accumulation: each turn re-processes all prior audio (triangular token growth)',
      'Turn structure: user speaks ~45s, agent responds ~12s, ~10% silence → ~9 turns per 10-min session',
      'OpenAI cached audio context at $0.40/1M (80× cheaper); Gemini has no documented cache discount',
    ],
  },
  ultravox: {
    sourceUrls: ['https://www.ultravox.ai/pricing'],
    lastVerifiedAt: '2026-02-21',
    assumptions: [
      'Pro plan: $100/mo, 30 free minutes, $0.05/min after, no concurrency cap',
    ],
  },
  soniox: {
    sourceUrls: ['https://soniox.com/pricing'],
    lastVerifiedAt: '2026-02-21',
    assumptions: [
      'Real-time streaming: input audio $2.00/1M tokens, output text $4.00/1M tokens',
      '1 hour audio ≈ 60K input tokens + ~15K output tokens → ~$0.12/hr ($0.002/min)',
      'No minimum commitment or subscription tiers for API usage',
    ],
  },
  deepgram: {
    sourceUrls: ['https://deepgram.com/pricing'],
    lastVerifiedAt: '2026-02-18',
    assumptions: [
      'Pay As You Go: Nova-3 mono $0.0077/min, multi $0.0092/min — no minimum',
      'Growth: Nova-3 mono $0.0065/min, multi $0.0078/min — $4K/yr minimum commitment ($333/mo)',
      'Optimizer auto-selects cheapest plan: PAYG below ~43K STT min/mo, Growth above',
      'Speaker Diarization add-on ($0.0020/min PAYG) not included — add separately if needed',
    ],
  },
  pipecat: {
    sourceUrls: [
      'https://www.daily.co/pricing/pipecat-cloud/',
      'https://www.daily.co/pricing/webrtc-infrastructure/',
    ],
    lastVerifiedAt: '2026-02-20',
    assumptions: [
      'Agent-1x profile: $0.01/min active (on-demand), $0.0005/min reserved (24/7)',
      'Reserved instances run continuously (43,200 min/month); sessions within reserved capacity incur no additional active charge',
      'Sessions exceeding reserved capacity fall back to on-demand active pricing ($0.01/min)',
      'Capacity planning: Optimal Reserved = MAX(Baseline Sessions, CPS × Idle Creation Delay), Idle Creation Delay ≈ 30s',
      'Daily WebRTC 1:1 voice free on Pipecat Cloud',
      'Daily volume discounts applied for standalone transport',
    ],
  },
  azure: {
    sourceUrls: ['https://azure.microsoft.com/en-us/pricing/', 'https://docs.livekit.io/transport/self-hosting/egress/'],
    lastVerifiedAt: '2026-02-23',
    assumptions: [
      'AKS Standard: $73/mo control plane + D2s_v3 nodes at ~$70/mo each',
      'One pod per bot for process isolation (~6 concurrent bots per D2s_v3 node)',
      'LiveKit Egress: D4s_v3 nodes ($140/mo each), 1 RoomComposite job per node, ~50 TrackEgress jobs per node',
      'Egress 30% availability headroom per LiveKit recommendation',
      'Average session: 10 minutes',
    ],
  },
};

// ─── LiveKit Cloud Plans ──────────────────────────────────
// Source: https://livekit.io/pricing (Feb 2026)
// Build plan excluded: dev-only (1 deployment, 5 concurrent, community support)

export interface LiveKitPlan {
  name: string;
  monthlyFee: number;
  // Agent sessions
  includedAgentMinutes: number;
  agentMinuteRate: number;
  // WebRTC participant minutes (1:1 voice = same as agent minutes)
  includedWebRtcMinutes: number;
  webRtcOverageRate: number;
  // Agent observability (session recordings)
  includedObservabilityMinutes: number;
  observabilityOverageRate: number;
  // Recording & export (transcode minutes, shared with stream import)
  includedTranscodeMinutes: number;
  transcodeAudioRate: number;
  transcodeVideoRate: number;
  // Downstream data transfer (Media Transport)
  includedDataTransferGB: number;
  dataTransferOveragePerGB: number;
  // Inference
  includedInferenceCredits: number;
  sttDiscount: boolean;
  ttsDiscount: boolean;
}

export const LIVEKIT_PLANS: LiveKitPlan[] = [
  {
    name: 'Ship',
    monthlyFee: 50,
    includedAgentMinutes: 5000,
    agentMinuteRate: 0.01,
    includedWebRtcMinutes: 150000,
    webRtcOverageRate: 0.0005,
    includedObservabilityMinutes: 5000,
    observabilityOverageRate: 0.005,
    includedTranscodeMinutes: 600,
    transcodeAudioRate: 0.005,
    transcodeVideoRate: 0.02,
    includedDataTransferGB: 250,
    dataTransferOveragePerGB: 0.12,
    includedInferenceCredits: 5,
    sttDiscount: false,
    ttsDiscount: false,
  },
  {
    name: 'Scale',
    monthlyFee: 500,
    includedAgentMinutes: 50000,
    agentMinuteRate: 0.01,
    includedWebRtcMinutes: 1500000,
    webRtcOverageRate: 0.0004,
    includedObservabilityMinutes: 50000,
    observabilityOverageRate: 0.005,
    includedTranscodeMinutes: 8000,
    transcodeAudioRate: 0.004,
    transcodeVideoRate: 0.015,
    includedDataTransferGB: 3000,      // 3TB
    dataTransferOveragePerGB: 0.10,
    includedInferenceCredits: 50,
    sttDiscount: true,
    ttsDiscount: true,
  },
];

// ─── LiveKit Inference: STT (per minute) ──────────────────

export const LIVEKIT_STT: Record<string, { buildShip: number; scale: number }> = {
  'assemblyai-universal-streaming':              { buildShip: 0.0025, scale: 0.0025 },
  'assemblyai-universal-streaming-multilingual': { buildShip: 0.0025, scale: 0.0025 },
  'cartesia-ink-whisper':                        { buildShip: 0.0030, scale: 0.0023 },
  'deepgram-nova-3':                             { buildShip: 0.0077, scale: 0.0065 },
  'deepgram-nova-3-multilingual':                { buildShip: 0.0092, scale: 0.0078 },
  'soniox-realtime':                             { buildShip: 0.0020, scale: 0.0020 },  // BYOP, direct pricing
};

// ─── LiveKit Inference: TTS (per million characters) ──────

export const LIVEKIT_TTS: Record<string, { buildShip: number; scale: number }> = {
  'cartesia-sonic-3':            { buildShip: 50,  scale: 37.50 },
  'elevenlabs-turbo-v2.5':      { buildShip: 150, scale: 60 },
};

// ─── LiveKit Inference: LLM (per million tokens) ──────────

export const LIVEKIT_LLM: Record<string, { input: number; cachedInput: number; output: number }> = {
  'gpt-5.2':          { input: 1.75,  cachedInput: 0.175, output: 14.00 },
  'gemini-3-pro':     { input: 4.00,  cachedInput: 0.40,  output: 18.00 },
  'gemini-3-flash':   { input: 0.50,  cachedInput: 0.05,  output: 3.00 },
};

// ─── Assumptions for Conversion ───────────────────────────
// Placed before S2S constants because calcS2sSessionCost() depends on these values.

export const ASSUMPTIONS = {
  sttDutyRatio: 0.66,             // user speaks ~66% of session time
  ttsDutyRatio: 0.24,             // agent speaks ~24% of session time (~10% is silence)
  avgCharsPerMinuteTTS: 900,      // ~150 words/min * ~6 chars/word (during active TTS)
  llmSystemPromptTokens: 500,     // system prompt + tool definitions (cached after turn 1)
  llmNewInputTokensPerTurn: 80,   // user voice utterance as text tokens per turn
  llmOutputTokensPerTurn: 200,    // agent response text tokens per turn
  avgDownstreamMBPerMinute: 0.24, // Opus voice ~32kbps downstream to participant
  avgSessionMinutes: 15,          // typical voice agent session length
  peakToAvgRatio: 2,              // peak concurrent ≈ 2× average (standard traffic assumption)
  s2sUserTurnSec: 45,             // user speaks ~45 sec per turn
  s2sAgentTurnSec: 12,            // agent responds ~12 sec per turn
  s2sSilenceRatio: 0.10,          // ~10% silence between turns
};

// ─── Speech-to-Speech Token Parameters ───────────────────
//
// Raw token rates and per-token prices for S2S models.
// Used by calcS2sSessionCost() to compute turn-based accumulation.

export interface S2sTokenParams {
  inputTokensPerSec: number;
  outputTokensPerSec: number;
  inputPricePerMillion: number;
  cachedInputPricePerMillion: number | null; // null = no documented cache discount
  outputPricePerMillion: number;
}

export const S2S_TOKEN_PARAMS: Record<string, S2sTokenParams> = {
  'openai-realtime': {
    inputTokensPerSec: 10,             // 1 per 100ms (OpenAI docs)
    outputTokensPerSec: 20,            // 1 per 50ms (OpenAI docs)
    inputPricePerMillion: 32.00,
    cachedInputPricePerMillion: 0.40,  // cached audio input nearly free
    outputPricePerMillion: 64.00,
  },
  'gemini-live': {
    inputTokensPerSec: 25,             // ~25 tok/sec (community-measured estimate)
    outputTokensPerSec: 25,            // same rate for output audio
    inputPricePerMillion: 3.00,
    cachedInputPricePerMillion: null,   // no documented cache discount for Live API
    outputPricePerMillion: 12.00,
  },
};

// ─── LiveKit Speech-to-Speech Models ──────────────────────
// OpenAI/Gemini S2S rates are computed dynamically via calcLiveKitS2sPerMinute()
// because they depend on session length (turn-based accumulation).
// Ultravox uses flat per-minute pricing (not token-based).
export const LIVEKIT_S2S: Record<string, { perMinute: number }> = {
  'ultravox':         { perMinute: 0.055 },
};

// ─── Pipecat Cloud ────────────────────────────────────────

export const MINUTES_PER_MONTH = 43_200; // 30 days × 24 hours × 60 minutes

export const PIPECAT_HOSTING = {
  agent1x: {
    activePerMin: 0.01,
    reservedPerMin: 0.0005,
  },
};

// Capacity planning for reserved instances (min-agents).
// Formula: Optimal Reserved = MAX(Baseline Sessions, CPS × Idle Creation Delay)
// Source: https://docs.pipecat.ai/pipecat-cloud/capacity-planning
export const PIPECAT_CAPACITY_PLANNING = {
  idleCreationDelaySec: 30,
};

export const PIPECAT_TRANSPORT = {
  webrtcVoice: 0,        // Free for 1:1 voice sessions on Pipecat Cloud
};

// ─── Krisp VIVA Noise Cancellation ───────────────────────
// Source: https://www.daily.co/pricing/pipecat-cloud/#krisp-viva

export const KRISP_VIVA = {
  freeMinutes: 10000,    // first 10K active session min/month included free on Pipecat Cloud
  perMinuteAfterFree: 0.0015,
};

// Krisp noise cancellation via Daily add-on (self-hosted Pipecat / Daily WebRTC)
// Source: https://www.daily.co/pricing/video-sdk/ (Add-ons section)
export const DAILY_KRISP_ADDON = {
  perParticipantMinute: 0.0002,
};

export const PIPECAT_RECORDING = {
  audioOnly: 0.005,      // Daily recording processing, per minute
  audioVideo: 0.01349,   // Daily recording processing, per minute
};

// Azure Blob Storage Hot LRS for recording storage (replaces Daily storage @ $0.003/min).
// Source: https://azure.microsoft.com/en-us/pricing/details/storage/blobs/
export const AZURE_BLOB_STORAGE = {
  perGBMonth: 0.018,               // Hot tier, LRS, US East
  audioMBPerMinute: 0.5,           // ~64kbps Opus/AAC compressed audio
  videoMBPerMinute: 5,             // ~720p compressed video
};

// ─── Daily WebRTC Volume Discounts (standalone / self-hosted pipecat) ───

export interface DailyTier {
  upTo: number;
  videoAudio: number;
  audioOnly: number;
}

export const DAILY_TIERS: DailyTier[] = [
  { upTo: 10000,     videoAudio: 0,       audioOnly: 0 },        // free
  { upTo: 100000,    videoAudio: 0.0040,  audioOnly: 0.00099 },
  { upTo: 500000,    videoAudio: 0.0037,  audioOnly: 0.00092 },
  { upTo: 1000000,   videoAudio: 0.0034,  audioOnly: 0.00085 },
  { upTo: 10000000,  videoAudio: 0.0030,  audioOnly: 0.00074 },
  { upTo: 25000000,  videoAudio: 0.0026,  audioOnly: 0.00064 },
  { upTo: 50000000,  videoAudio: 0.0022,  audioOnly: 0.00054 },
  { upTo: Infinity,  videoAudio: 0.0015,  audioOnly: 0.00036 },
];

// ─── Direct Provider Pricing (self-hosted / Pipecat BYOP) ──

// STT: per minute (non-Deepgram; Deepgram uses DEEPGRAM_STT_PLANS below)
export const DIRECT_STT: Record<string, number> = {
  'assemblyai-universal-streaming':              0.0025,  // $0.15/hr
  'assemblyai-universal-streaming-multilingual': 0.0025,
  'cartesia-ink-whisper':                        0.0022,  // Scale plan ~$0.13/hr
  'soniox-realtime':                             0.0020,  // ~$0.12/hr streaming
};

// TTS: per million characters
export const DIRECT_TTS: Record<string, number> = {
  'cartesia-sonic-3':            30,   // Scale plan ($239/mo for 8M credits)
  'elevenlabs-turbo-v2.5':      60,   // Business plan, Flash/Turbo (0.5 credits/char)
};

// LLM: per million tokens (direct OpenAI/Google pricing)
export const DIRECT_LLM: Record<string, { input: number; cachedInput: number; output: number }> = {
  'gpt-5.2':          { input: 1.75,  cachedInput: 0.175, output: 14.00 },
  'gemini-3-pro':     { input: 4.00,  cachedInput: 0.40,  output: 18.00 },
  'gemini-3-flash':   { input: 0.50,  cachedInput: 0.05,  output: 3.00 },
};

// ─── Speech-to-Speech Session Cost (Turn-Based Accumulation) ─────
//
// Each conversational turn re-processes ALL prior audio as input context,
// creating a triangular token growth pattern:
//
//   Turn 1: processes T_new input tokens (no prior context)
//   Turn 2: processes T_new + T_ctx tokens (re-reads turn 1 audio)
//   Turn k: processes T_new + (k-1) × T_ctx tokens
//
// Total context tokens across N turns = N×(N-1)/2 × T_ctx (triangular sum)
//
// Context is billed at the cached input rate if available (OpenAI: $0.40/1M),
// or at full input price if no cache discount (Gemini: $3.00/1M).
//
// Sources:
//   OpenAI: https://developers.openai.com/api/docs/models/gpt-realtime
//   Gemini: https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash-native-audio

/**
 * Compute S2S cost for one session with turn-based context accumulation.
 *
 * Each turn re-processes all prior audio as input context (triangular growth):
 *   Turn k input = new_user_audio + context(all prior user + agent audio from turns 1..k-1)
 *   Turn k output = new_agent_audio (always fresh, no accumulation)
 *
 * Returns total session cost in dollars.
 */
export function calcS2sSessionCost(model: string, sessionMinutes: number): number {
  const params = S2S_TOKEN_PARAMS[model];
  if (!params) return 0;

  const { s2sUserTurnSec, s2sAgentTurnSec, s2sSilenceRatio } = ASSUMPTIONS;

  // Turn cycle including silence gaps
  const activeTurnSec = s2sUserTurnSec + s2sAgentTurnSec;
  const turnCycleSec = activeTurnSec / (1 - s2sSilenceRatio);
  const N = Math.max(1, Math.floor(sessionMinutes * 60 / turnCycleSec));

  // New tokens generated per turn
  const newInputTokensPerTurn = s2sUserTurnSec * params.inputTokensPerSec;
  const newOutputTokensPerTurn = s2sAgentTurnSec * params.outputTokensPerSec;

  // Context from each prior turn includes BOTH user and agent audio
  const contextTokensPerPriorTurn =
    s2sUserTurnSec * params.inputTokensPerSec +
    s2sAgentTurnSec * params.outputTokensPerSec;

  // Fresh tokens (new audio each turn)
  const totalFreshInputTokens = N * newInputTokensPerTurn;
  const totalOutputTokens = N * newOutputTokensPerTurn;

  // Context re-processing (triangular sum: turn k re-reads (k-1) prior turns)
  const totalContextTokens = (N * (N - 1) / 2) * contextTokensPerPriorTurn;

  // Cost calculation
  const freshInputCost = (totalFreshInputTokens / 1_000_000) * params.inputPricePerMillion;
  const contextRate = params.cachedInputPricePerMillion ?? params.inputPricePerMillion;
  const contextCost = (totalContextTokens / 1_000_000) * contextRate;
  const outputCost = (totalOutputTokens / 1_000_000) * params.outputPricePerMillion;

  return freshInputCost + contextCost + outputCost;
}

/** Effective per-minute S2S rate averaged over a typical session. */
export function calcS2sPerMinute(model: string, sessionMinutes: number): number {
  return calcS2sSessionCost(model, sessionMinutes) / sessionMinutes;
}

/** LiveKit S2S rate = direct rate + ~10% inference margin. */
export function calcLiveKitS2sPerMinute(model: string, sessionMinutes: number): number {
  return calcS2sPerMinute(model, sessionMinutes) * 1.10;
}

// ─── LLM Text Turn-Based Token Accumulation ─────────────
//
// Same triangular accumulation pattern as S2S, but for text tokens.
// Each LLM call includes full conversation history as input context:
//
//   Turn 1: system prompt (fresh) + user message (fresh) → agent response
//   Turn k: system prompt (cached) + prior turns (cached) + user message (fresh) → agent response
//
// Context is billed at the cached input rate (prompt caching).

export interface LlmTextTurnResult {
  turns: number;
  totalFreshInputTokens: number;   // system prompt (turn 1) + new user messages
  totalContextTokens: number;       // cached system prompt (turns 2+) + prior conversation
  totalOutputTokens: number;        // agent responses
}

export function calcLlmTextTurnTokens(sessionMinutes: number): LlmTextTurnResult {
  const { s2sUserTurnSec, s2sAgentTurnSec, s2sSilenceRatio,
          llmSystemPromptTokens, llmNewInputTokensPerTurn, llmOutputTokensPerTurn } = ASSUMPTIONS;

  // Same voice conversation cadence as S2S
  const activeTurnSec = s2sUserTurnSec + s2sAgentTurnSec;
  const turnCycleSec = activeTurnSec / (1 - s2sSilenceRatio);
  const N = Math.max(1, Math.floor(sessionMinutes * 60 / turnCycleSec));

  // Fresh input: system prompt (turn 1 only) + new user message each turn
  const totalFreshInputTokens = llmSystemPromptTokens + N * llmNewInputTokensPerTurn;

  // Output: agent response each turn
  const totalOutputTokens = N * llmOutputTokensPerTurn;

  // Cached context: system prompt (turns 2..N) + conversation history (triangular)
  const cachedSystemTokens = Math.max(0, N - 1) * llmSystemPromptTokens;
  const contextPerPriorTurn = llmNewInputTokensPerTurn + llmOutputTokensPerTurn;
  const cachedConversationTokens = (N * (N - 1) / 2) * contextPerPriorTurn;
  const totalContextTokens = cachedSystemTokens + cachedConversationTokens;

  return { turns: N, totalFreshInputTokens, totalContextTokens, totalOutputTokens };
}

// ─── Ultravox S2S Pro Plan ────────────────────────────────
// Source: https://www.ultravox.ai/pricing (Feb 2026)
// Pro: $100/mo, 30 free minutes included, $0.05/min after, no concurrency cap.

export const ULTRAVOX_PRO = {
  monthlyFee: 100,
  includedMinutes: 30,
  perMinuteRate: 0.05,
};

// ─── LiveKit Egress Self-Hosted Infra ─────────────────────
// Source: https://docs.livekit.io/transport/self-hosting/egress/
// Each Egress worker needs ≥4 CPUs + 4 GB RAM.
// RoomComposite: 1 job per worker (2-6 CPUs, Chrome headless).
// TrackEgress: lightweight, ~50 concurrent jobs per worker (no transcoding).
// LiveKit recommends keeping ≥30% of instances available for incoming requests.

export const LIVEKIT_EGRESS = {
  nodeMonthly: 140,              // D4s_v3 (4 vCPU, 16 GB) on Azure
  compositeJobsPerNode: 1,       // RoomComposite egress: 1 per worker
  trackJobsPerNode: 50,          // TrackEgress: lightweight, many per worker
  availabilityHeadroom: 1.3,     // 30% headroom per LiveKit docs
};

// ─── Azure Self-Hosting ───────────────────────────────────

// AKS is the recommended self-hosting option for voice agents.
// Each bot runs in its own process/pod for resource isolation (per Pipecat guidance).
// Kubernetes natively supports one-pod-per-bot with autoscaling, health checks,
// and graceful draining — a natural fit vs. managing processes on App Service.
// D2s_v3 node (2 vCPU, 8GB): ~6 concurrent bot pods per node.
export const AZURE_AKS = {
  name: 'AKS Standard',
  controlPlane: 73,       // monthly control plane fee
  nodeMonthly: 70,        // D2s_v3 per node
  concurrentAgentsPerNode: 6,
  avgSessionMinutes: 15,
};

// ─── Provider Subscription Tiers ─────────────────────────
// For Pipecat Cloud BYOP and self-hosted direct provider pricing.
// Replaces flat per-unit rates with tier-aware cost optimization.

export interface ProviderTier {
  name: string;
  monthlyFee: number;
  includedUnits: number;   // credits (Cartesia) or characters (ElevenLabs)
  overageRate: number;     // per unit above included; 0 = no overage (must upgrade)
}

// Cartesia: credits shared between Sonic TTS (1 credit/char) and Ink Whisper STT (1 credit/sec)
// Source: https://cartesia.ai/pricing (yearly billing prices)
export const CARTESIA_TIERS: ProviderTier[] = [
  { name: 'Free',    monthlyFee: 0,   includedUnits: 20_000,    overageRate: 0 },
  { name: 'Pro',     monthlyFee: 4,   includedUnits: 100_000,   overageRate: 0 },
  { name: 'Startup', monthlyFee: 39,  includedUnits: 1_250_000, overageRate: 0 },
  { name: 'Scale',   monthlyFee: 239, includedUnits: 8_000_000, overageRate: 0.00002988 },
];

// ElevenLabs Turbo v2.5 (Flash/Turbo Multilingual): 0.5 credits/char
// includedUnits = plan credits ÷ 0.5 credits/char (expressed in characters)
// overageRate = per character of output (converted from their $/min via ~1000 chars/min)
// Source: https://elevenlabs.io/pricing (Flash row in Compare Plans table)
export const ELEVENLABS_TURBO_TIERS: ProviderTier[] = [
  { name: 'Free',     monthlyFee: 0,     includedUnits: 20_000,     overageRate: 0 },
  { name: 'Starter',  monthlyFee: 5,     includedUnits: 60_000,     overageRate: 0 },
  { name: 'Creator',  monthlyFee: 22,    includedUnits: 200_000,    overageRate: 0.00015 },
  { name: 'Pro',      monthlyFee: 99,    includedUnits: 1_000_000,  overageRate: 0.00012 },
  { name: 'Scale',    monthlyFee: 330,   includedUnits: 4_000_000,  overageRate: 0.00009 },
  { name: 'Business', monthlyFee: 1_320, includedUnits: 22_000_000, overageRate: 0.00006 },
];

// ─── Deepgram STT Plans ──────────────────────────────────
// Source: https://deepgram.com/pricing (Feb 2026)
// Pay As You Go: no minimum, standard rates
// Growth: $4K/year minimum commitment (~$333.33/mo), ~15-20% discount on per-minute rates
// The cost engine evaluates both and picks whichever is cheaper at a given volume.

export interface DeepgramSttPlan {
  name: string;
  minAnnualCommitment: number;
  rates: Record<string, number>;
}

export const DEEPGRAM_STT_PLANS: DeepgramSttPlan[] = [
  {
    name: 'Pay As You Go',
    minAnnualCommitment: 0,
    rates: {
      'deepgram-nova-3':              0.0077,
      'deepgram-nova-3-multilingual': 0.0092,
    },
  },
  {
    name: 'Growth',
    minAnnualCommitment: 4000,
    rates: {
      'deepgram-nova-3':              0.0065,
      'deepgram-nova-3-multilingual': 0.0078,
    },
  },
];

// ─── Restrictions / Notes ─────────────────────────────────

export interface Restriction {
  platform: string;
  plan?: string;
  note: string;
}

export const RESTRICTIONS: Restriction[] = [
  { platform: 'LiveKit', plan: 'Ship', note: 'Max 2 agent deployments, 20 concurrent sessions, email support' },
  { platform: 'LiveKit', plan: 'Scale', note: 'Includes region pinning, HIPAA compliance, inference discounts' },
  { platform: 'Pipecat Cloud', note: 'Unlimited concurrency, BYOP for all inference providers' },
  { platform: 'Self-hosted', note: 'You manage infrastructure, scaling, and monitoring. No platform SLA.' },
];
