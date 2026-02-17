import type { StackConfig } from '@/data/types';

// Encode stacks + minutes into URL search params
export function encodeState(stacks: StackConfig[], monthlyMinutes: number): string {
  const params = new URLSearchParams();
  params.set('min', String(monthlyMinutes));

  stacks.forEach((s, i) => {
    const prefix = `s${i}`;
    params.set(`${prefix}_p`, s.platform);
    params.set(`${prefix}_h`, s.hosting);
    params.set(`${prefix}_pi`, s.pipeline);
    params.set(`${prefix}_stt`, s.sttModel);
    params.set(`${prefix}_llm`, s.llmModel);
    params.set(`${prefix}_tts`, s.ttsModel);
    params.set(`${prefix}_s2s`, s.speechToSpeechModel);
    params.set(`${prefix}_c`, s.callMode);
    params.set(`${prefix}_r`, s.recordingMode);
    params.set(`${prefix}_v`, s.visible ? '1' : '0');
    params.set(`${prefix}_l`, s.label);
  });

  params.set('n', String(stacks.length));
  return params.toString();
}

// Decode URL search params into stacks + minutes
export function decodeState(search: string): { stacks: StackConfig[]; monthlyMinutes: number } | null {
  try {
    const params = new URLSearchParams(search);
    const n = parseInt(params.get('n') || '0', 10);
    const monthlyMinutes = parseInt(params.get('min') || '0', 10);

    if (n === 0 || monthlyMinutes === 0) return null;

    const stacks: StackConfig[] = [];
    for (let i = 0; i < n; i++) {
      const prefix = `s${i}`;
      stacks.push({
        id: `stack-${i + 1}`,
        label: params.get(`${prefix}_l`) || `Stack ${i + 1}`,
        platform: (params.get(`${prefix}_p`) || 'pipecat') as StackConfig['platform'],
        hosting: (params.get(`${prefix}_h`) || 'cloud') as StackConfig['hosting'],
        pipeline: (params.get(`${prefix}_pi`) || 'stt-llm-tts') as StackConfig['pipeline'],
        sttModel: (params.get(`${prefix}_stt`) || 'deepgram-nova-3') as StackConfig['sttModel'],
        llmModel: (params.get(`${prefix}_llm`) || 'gpt-5.2') as StackConfig['llmModel'],
        ttsModel: (params.get(`${prefix}_tts`) || 'cartesia-sonic-3') as StackConfig['ttsModel'],
        speechToSpeechModel: (params.get(`${prefix}_s2s`) || 'openai-realtime') as StackConfig['speechToSpeechModel'],
        callMode: (params.get(`${prefix}_c`) || 'audio-only') as StackConfig['callMode'],
        recordingMode: (params.get(`${prefix}_r`) || 'none') as StackConfig['recordingMode'],
        visible: params.get(`${prefix}_v`) !== '0',
      });
    }

    return { stacks, monthlyMinutes };
  } catch {
    return null;
  }
}

export function pushState(stacks: StackConfig[], monthlyMinutes: number) {
  const encoded = encodeState(stacks, monthlyMinutes);
  const url = `${window.location.pathname}?${encoded}`;
  window.history.replaceState(null, '', url);
}
