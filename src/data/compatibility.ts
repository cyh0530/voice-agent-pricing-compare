import type { StackConfig, SelectOption, SttModel, LlmModel, TtsModel, SpeechToSpeechModel } from './types';

// ─── Blocked Combinations ─────────────────────────────────

interface BlockRule {
  test: (s: Partial<StackConfig>) => boolean;
  reason: string;
}

const BLOCK_RULES: BlockRule[] = [];

export function getBlockReason(stack: Partial<StackConfig>): string | null {
  for (const rule of BLOCK_RULES) {
    if (rule.test(stack)) return rule.reason;
  }
  return null;
}

// ─── Option Lists ─────────────────────────────────────────

export const STT_OPTIONS: SelectOption<SttModel>[] = [
  { value: 'assemblyai-universal-streaming', label: 'Universal Streaming', provider: 'AssemblyAI' },
  { value: 'assemblyai-universal-streaming-multilingual', label: 'Universal Streaming Multilingual', provider: 'AssemblyAI' },
  { value: 'cartesia-ink-whisper', label: 'Ink Whisper', provider: 'Cartesia' },
  { value: 'deepgram-nova-3', label: 'Nova-3', provider: 'Deepgram' },
  { value: 'deepgram-nova-3-multilingual', label: 'Nova-3 Multilingual', provider: 'Deepgram' },
];

export const LLM_OPTIONS: SelectOption<LlmModel>[] = [
  { value: 'gpt-5.2', label: 'GPT-5.2', provider: 'OpenAI' },
  { value: 'gemini-3-pro', label: 'Gemini 3 Pro', provider: 'Google' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash', provider: 'Google' },
];

export const TTS_OPTIONS: SelectOption<TtsModel>[] = [
  { value: 'cartesia-sonic-3', label: 'Sonic 3', provider: 'Cartesia' },
  { value: 'elevenlabs-turbo-v2.5', label: 'Turbo v2.5', provider: 'ElevenLabs' },
];

export const S2S_OPTIONS: SelectOption<SpeechToSpeechModel>[] = [
  { value: 'openai-realtime', label: 'Realtime API', provider: 'OpenAI' },
  { value: 'gemini-live', label: 'Gemini Live', provider: 'Google' },
];

export const CHART_COLORS = [
  '#06D6A0', // green
  '#7C5CFC', // violet
  '#FFB547', // amber
  '#22D3EE', // cyan
  '#FB7185', // rose
  '#A78BFA', // light violet
  '#34D399', // emerald
  '#F97316', // orange
];
