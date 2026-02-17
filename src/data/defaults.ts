import type { StackConfig } from './types';

let counter = 0;
const nextId = () => `stack-${++counter}`;

export const DEFAULT_STACKS: StackConfig[] = [
  {
    id: nextId(),
    label: 'Pipecat Cloud',
    platform: 'pipecat',
    hosting: 'cloud',
    pipeline: 'stt-llm-tts',
    sttModel: 'deepgram-nova-3',
    llmModel: 'gpt-5.2',
    ttsModel: 'cartesia-sonic-3',
    speechToSpeechModel: 'openai-realtime',
    callMode: 'audio-video',
    recordingMode: 'audio-video',
    visible: true,
  },
  {
    id: nextId(),
    label: 'LiveKit Cloud',
    platform: 'livekit',
    hosting: 'cloud',
    pipeline: 'stt-llm-tts',
    sttModel: 'deepgram-nova-3',
    llmModel: 'gpt-5.2',
    ttsModel: 'cartesia-sonic-3',
    speechToSpeechModel: 'openai-realtime',
    callMode: 'audio-video',
    recordingMode: 'audio-video',
    visible: true,
  },
  {
    id: nextId(),
    label: 'Pipecat Self-Host',
    platform: 'pipecat',
    hosting: 'self-hosted',
    pipeline: 'stt-llm-tts',
    sttModel: 'deepgram-nova-3',
    llmModel: 'gpt-5.2',
    ttsModel: 'cartesia-sonic-3',
    speechToSpeechModel: 'openai-realtime',
    callMode: 'audio-video',
    recordingMode: 'audio-video',
    visible: true,
  },
  {
    id: nextId(),
    label: 'LiveKit Self-Host',
    platform: 'livekit',
    hosting: 'self-hosted',
    pipeline: 'stt-llm-tts',
    sttModel: 'deepgram-nova-3',
    llmModel: 'gpt-5.2',
    ttsModel: 'cartesia-sonic-3',
    speechToSpeechModel: 'openai-realtime',
    callMode: 'audio-video',
    recordingMode: 'audio-video',
    visible: true,
  },
];

export const DEFAULT_MONTHLY_MINUTES = 10000;

export function createNewStack(index: number): StackConfig {
  return {
    id: nextId(),
    label: `Stack ${index + 1}`,
    platform: 'pipecat',
    hosting: 'cloud',
    pipeline: 'stt-llm-tts',
    sttModel: 'deepgram-nova-3',
    llmModel: 'gpt-5.2',
    ttsModel: 'cartesia-sonic-3',
    speechToSpeechModel: 'openai-realtime',
    callMode: 'audio-video',
    recordingMode: 'audio-video',
    visible: true,
  };
}
