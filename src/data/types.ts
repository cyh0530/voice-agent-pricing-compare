export type Platform = 'livekit' | 'pipecat';
export type Hosting = 'cloud' | 'self-hosted';
export type Pipeline = 'stt-llm-tts' | 'speech-to-speech';
export type CallMode = 'audio-only' | 'audio-video';
export type RecordingMode = 'none' | 'audio-only' | 'audio-video';

export type SttModel =
  | 'assemblyai-universal-streaming'
  | 'assemblyai-universal-streaming-multilingual'
  | 'cartesia-ink-whisper'
  | 'deepgram-nova-3'
  | 'deepgram-nova-3-multilingual'
  | 'soniox-realtime';

export type LlmModel =
  | 'gpt-5.2'
  | 'gemini-3-pro'
  | 'gemini-3-flash';

export type TtsModel =
  | 'cartesia-sonic-3'
  | 'elevenlabs-turbo-v2.5';

export type SpeechToSpeechModel =
  | 'openai-realtime'
  | 'gemini-live';

export interface StackConfig {
  id: string;
  label: string;
  platform: Platform;
  hosting: Hosting;
  pipeline: Pipeline;
  sttModel: SttModel;
  llmModel: LlmModel;
  ttsModel: TtsModel;
  speechToSpeechModel: SpeechToSpeechModel;
  callMode: CallMode;
  recordingMode: RecordingMode;
  visible: boolean;
}

export interface CostBreakdown {
  platform: number;
  transport: number;
  noiseCancellation: number;
  stt: number;
  llm: number;
  tts: number;
  recording: number;
  total: number;
  details: CostDetail[];
  bestPlans: Record<string, string>;
  warnings: string[];
}

export interface CostDetail {
  category: string;
  label: string;
  formula: string;
  amount: number;
  sourceUrl?: string;
}

export interface PricingMeta {
  sourceUrls: string[];
  lastVerifiedAt: string;
  assumptions: string[];
}

export interface ChartPoint {
  minutes: number;
  cost: number;
}

export interface ChartSeries {
  stackId: string;
  label: string;
  color: string;
  points: ChartPoint[];
}

export interface AppState {
  stacks: StackConfig[];
  monthlyMinutes: number;
  focusedStackId: string | null;
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  provider?: string;
  disabled?: boolean;
  disabledReason?: string;
}
