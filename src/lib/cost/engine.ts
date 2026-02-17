import { informationalRestrictions, pricingCatalog } from "../../data/catalog";
import type {
  CostBreakdown,
  FormulaLine,
  StackConfig,
  Hosting,
  Pipeline,
} from "../../types";

const HEADROOM_MULTIPLIER = 1.15;

export const tierMinutes = [1000, 5000, 10000, 50000, 100000];

const toMoney = (v: number): number => Number(v.toFixed(2));

interface SupportCheck {
  ok: boolean;
  reason?: string;
}

function checkSupport(hosting: Hosting, pipeline: Pipeline, platform: StackConfig["platform"], callMode: StackConfig["callMode"], stt: StackConfig["stt"]): SupportCheck {
  if (platform === "pipecat" && hosting === "cloud" && pipeline !== "agent1x-daily") {
    return {
      ok: false,
      reason: "Pipecat Cloud only supports Agent-1x + Daily transport in this release.",
    };
  }

  if (platform === "livekit" && pipeline === "agent1x-daily") {
    return {
      ok: false,
      reason: "LiveKit stacks cannot use the Pipecat Agent-1x + Daily pipeline.",
    };
  }

  if (callMode === "audio-video" && stt === "elevenlabs") {
    return {
      ok: false,
      reason: "ElevenLabs STT is configured here as audio-first and blocked for video calls.",
    };
  }

  return { ok: true };
}

function chooseSelfHostedPlan(monthlyMinutes: number): {
  id: "app-service" | "aks";
  cost: number;
  lines: FormulaLine[];
} {
  const requiredAtHeadroom = monthlyMinutes * HEADROOM_MULTIPLIER;
  const options = pricingCatalog.selfHostedProfiles.map((profile) => {
    const overageMinutes = Math.max(0, requiredAtHeadroom - profile.includedMinutesAtHeadroom);
    const total = profile.baseCost + overageMinutes * profile.overagePerMinute;
    return { id: profile.id, total, overageMinutes };
  });

  const winner = options.reduce((best, option) => (option.total < best.total ? option : best), options[0]);

  return {
    id: winner.id,
    cost: winner.total,
    lines: [
      { label: `Headroom minutes (x${HEADROOM_MULTIPLIER.toFixed(2)})`, value: requiredAtHeadroom },
      {
        label: `Self-hosted base (${winner.id === "app-service" ? "App Service" : "AKS"})`,
        value: pricingCatalog.selfHostedProfiles.find((p) => p.id === winner.id)?.baseCost ?? 0,
      },
      {
        label: "Self-hosted overage",
        value:
          winner.overageMinutes *
          (pricingCatalog.selfHostedProfiles.find((p) => p.id === winner.id)?.overagePerMinute ?? 0),
      },
    ],
  };
}

export function computeCost(stack: StackConfig, monthlyMinutes: number): CostBreakdown {
  const support = checkSupport(stack.hosting, stack.pipeline, stack.platform, stack.callMode, stack.stt);
  if (!support.ok) {
    return {
      stackId: stack.id,
      monthlyMinutes,
      supported: false,
      unsupportedReason: support.reason,
      total: 0,
      lines: [],
      restrictions: [],
    };
  }

  const lines: FormulaLine[] = [];
  let total = 0;

  if (stack.hosting === "cloud") {
    if (stack.platform === "pipecat") {
      const agentCost = monthlyMinutes * pricingCatalog.platformRates.pipecatCloudPerMinute;
      const transportCost = monthlyMinutes * pricingCatalog.platformRates.pipecatDailyTransportPerMinute[stack.callMode];
      lines.push({ label: "Pipecat Cloud (Agent-1x)", value: agentCost });
      lines.push({ label: "Daily transport", value: transportCost });
      total += agentCost + transportCost;
    } else {
      const lkCost = monthlyMinutes * pricingCatalog.platformRates.livekitCloudPerMinute[stack.callMode];
      lines.push({ label: "LiveKit Cloud", value: lkCost });
      total += lkCost;
    }
  } else {
    const picked = chooseSelfHostedPlan(monthlyMinutes);
    lines.push(...picked.lines);
    total += picked.cost;
  }

  const sttCost = monthlyMinutes * pricingCatalog.providerRates.sttPerMinute[stack.stt];
  const llmCost = monthlyMinutes * pricingCatalog.providerRates.llmPerMinute[stack.llm];
  const ttsCost = monthlyMinutes * pricingCatalog.providerRates.ttsPerMinute[stack.tts];
  total += sttCost + llmCost + ttsCost;
  lines.push({ label: `STT (${stack.stt})`, value: sttCost });
  lines.push({ label: `LLM (${stack.llm})`, value: llmCost });
  lines.push({ label: `TTS (${stack.tts})`, value: ttsCost });

  if (stack.recording === "provider") {
    const rec = monthlyMinutes * pricingCatalog.providerRates.recordingPerMinute[stack.callMode];
    lines.push({ label: "Provider recording", value: rec });
    total += rec;
  }

  const restrictions: string[] = [];
  const key = `${stack.platform}:${stack.hosting}`;
  if (informationalRestrictions[key]) {
    restrictions.push(informationalRestrictions[key]);
  }

  const selfHostedPlanChoice =
    stack.hosting === "self-hosted" ? chooseSelfHostedPlan(monthlyMinutes).id : undefined;

  return {
    stackId: stack.id,
    monthlyMinutes,
    supported: true,
    total: toMoney(total),
    lines: lines.map((line) => ({ ...line, value: toMoney(line.value) })),
    restrictions,
    selfHostedPlanChoice,
  };
}

export function buildSeries(stack: StackConfig): number[] {
  return tierMinutes.map((minutes) => computeCost(stack, minutes).total);
}

export function recommendAzure(monthlyMinutes: number): {
  recommendation: "app-service" | "aks";
  reason: string;
  alternativeWhen: string;
} {
  const appService = chooseSelfHostedPlan(monthlyMinutes).id === "app-service";
  if (appService) {
    return {
      recommendation: "app-service",
      reason:
        "App Service is currently cheaper at this usage with lower maintenance overhead and enough realtime headroom.",
      alternativeWhen:
        "Choose AKS when sustained minutes or concurrency rise and infra efficiency becomes the dominant concern.",
    };
  }
  return {
    recommendation: "aks",
    reason:
      "AKS wins on long-run cost efficiency at this throughput and offers stronger control for high-scale realtime traffic.",
    alternativeWhen:
      "Choose App Service when you need faster ops velocity and lower platform-management complexity.",
  };
}
