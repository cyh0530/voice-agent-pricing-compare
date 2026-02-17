export type Platform = "pipecat" | "livekit";
export type Hosting = "cloud" | "self-hosted";
export type Pipeline = "agent1x-daily" | "livekit-realtime" | "custom";
export type CallMode = "audio" | "audio-video";
export type RecordingMode = "none" | "provider";

export type STTProvider = "assemblyai" | "cartesia" | "deepgram" | "elevenlabs";
export type LLMProvider =
  | "gpt-4.1-mini"
  | "gpt-4o-mini"
  | "gemini-2.0-flash"
  | "gemini-1.5-pro";
export type TTSProvider = "cartesia" | "elevenlabs";

export interface StackConfig {
  id: string;
  name: string;
  enabled: boolean;
  platform: Platform;
  hosting: Hosting;
  pipeline: Pipeline;
  stt: STTProvider;
  llm: LLMProvider;
  tts: TTSProvider;
  callMode: CallMode;
  recording: RecordingMode;
}

export interface PricingCatalog {
  sourceUrl: string[];
  lastVerifiedAt: string;
  assumptions: string[];
  providerRates: {
    sttPerMinute: Record<STTProvider, number>;
    llmPerMinute: Record<LLMProvider, number>;
    ttsPerMinute: Record<TTSProvider, number>;
    recordingPerMinute: Record<CallMode, number>;
  };
  platformRates: {
    pipecatCloudPerMinute: number;
    pipecatDailyTransportPerMinute: Record<CallMode, number>;
    livekitCloudPerMinute: Record<CallMode, number>;
  };
  selfHostedProfiles: Array<{
    id: "app-service" | "aks";
    label: string;
    baseCost: number;
    includedMinutesAtHeadroom: number;
    overagePerMinute: number;
    opsComplexity: "low" | "high";
    notes: string;
  }>;
}

export interface FormulaLine {
  label: string;
  value: number;
}

export interface CostBreakdown {
  stackId: string;
  monthlyMinutes: number;
  supported: boolean;
  unsupportedReason?: string;
  total: number;
  lines: FormulaLine[];
  restrictions: string[];
  selfHostedPlanChoice?: "app-service" | "aks";
}
