import type { PricingCatalog } from "../types";

export const pricingCatalog: PricingCatalog = {
  sourceUrl: [
    "https://pipecat.ai",
    "https://daily.co/pricing",
    "https://livekit.io/pricing",
    "https://azure.microsoft.com/pricing",
    "https://platform.openai.com/docs/pricing",
    "https://ai.google.dev/pricing",
    "https://soniox.com/pricing",
  ],
  lastVerifiedAt: "2026-02-17",
  assumptions: [
    "USD pre-tax only.",
    "Traffic profile is flat monthly usage for v1.",
    "Single average session duration assumption.",
    "Provider recording only, no storage lifecycle TCO.",
    "Self-hosted plans include 15% operational headroom.",
  ],
  providerRates: {
    sttPerMinute: {
      assemblyai: 0.0065,
      cartesia: 0.0058,
      deepgram: 0.0049,
      elevenlabs: 0.0072,
      soniox: 0.0020,
    },
    llmPerMinute: {
      "gpt-4.1-mini": 0.013,
      "gpt-4o-mini": 0.0105,
      "gemini-2.0-flash": 0.0091,
      "gemini-1.5-pro": 0.0185,
    },
    ttsPerMinute: {
      cartesia: 0.0095,
      elevenlabs: 0.0112,
    },
    recordingPerMinute: {
      audio: 0.0022,
      "audio-video": 0.0063,
    },
  },
  platformRates: {
    pipecatCloudPerMinute: 0.021,
    pipecatDailyTransportPerMinute: {
      audio: 0.0017,
      "audio-video": 0.0046,
    },
    livekitCloudPerMinute: {
      audio: 0.0188,
      "audio-video": 0.0315,
    },
  },
  selfHostedProfiles: [
    {
      id: "app-service",
      label: "Azure App Service",
      baseCost: 180,
      includedMinutesAtHeadroom: 12000,
      overagePerMinute: 0.0092,
      opsComplexity: "low",
      notes: "Simpler operations, good fit for lower to medium throughput.",
    },
    {
      id: "aks",
      label: "Azure AKS",
      baseCost: 420,
      includedMinutesAtHeadroom: 45000,
      overagePerMinute: 0.0062,
      opsComplexity: "high",
      notes: "Higher operational complexity, stronger scaling efficiency.",
    },
  ],
};

export const informationalRestrictions: Record<string, string> = {
  "livekit:cloud":
    "LiveKit cloud tiers can include deployment constraints by plan and concurrency.",
  "pipecat:cloud":
    "Pipecat cloud may add plan-specific controls for traffic shape and support SLAs.",
  "pipecat:self-hosted":
    "Pipecat self-hosted requires your own orchestration, observability, and patch cadence.",
  "livekit:self-hosted":
    "LiveKit self-hosted needs production WebRTC tuning and cluster-level networking expertise.",
};
