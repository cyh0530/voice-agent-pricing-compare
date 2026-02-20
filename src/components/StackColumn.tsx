import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CellPopover } from './CellPopover';
import type { StackConfig, CostBreakdown } from '@/data/types';
import {
  STT_OPTIONS,
  LLM_OPTIONS,
  TTS_OPTIONS,
  S2S_OPTIONS,
  getBlockReason,
} from '@/data/compatibility';
import { CHART_COLORS } from '@/data/compatibility';
import { X, AlertTriangle } from 'lucide-react';

interface StackColumnProps {
  stack: StackConfig;
  index: number;
  cost: CostBreakdown;
  isFocused: boolean;
  onUpdate: (updates: Partial<StackConfig>) => void;
  onRemove: () => void;
  onFocus: () => void;
}

function fmt(n: number): string {
  if (n === 0) return '$0.00';
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function groupByProvider<T extends string>(options: { value: T; label: string; provider?: string }[]) {
  const groups: Record<string, typeof options> = {};
  for (const opt of options) {
    const key = opt.provider || 'Other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(opt);
  }
  return groups;
}

export function StackColumn({ stack, index, cost, isFocused, onUpdate, onRemove, onFocus }: StackColumnProps) {
  const color = CHART_COLORS[index % CHART_COLORS.length];
  const blockReason = getBlockReason(stack);
  const isSpeechToSpeech = stack.pipeline === 'speech-to-speech';

  const sttGroups = groupByProvider(STT_OPTIONS);
  const llmGroups = groupByProvider(LLM_OPTIONS);
  const ttsGroups = groupByProvider(TTS_OPTIONS);

  return (
    <div
      className={`relative flex flex-col border rounded-xl transition-all duration-200 ${
        isFocused
          ? 'border-border-light bg-card shadow-lg'
          : 'border-border/50 bg-card/30 hover:bg-card/60'
      }`}
      style={{
        borderTopColor: isFocused ? color : undefined,
        borderTopWidth: isFocused ? '2px' : undefined,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50 cursor-pointer"
        onClick={onFocus}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <input
            className="bg-transparent text-base font-semibold text-foreground truncate w-full outline-none focus:text-neon transition-colors"
            value={stack.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={stack.visible}
            onCheckedChange={(visible) => onUpdate({ visible })}
          />
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 divide-y divide-border/30">
        <Row label="Platform">
          <Select value={stack.platform} onValueChange={(v) => onUpdate({ platform: v as StackConfig['platform'] })}>
            <SelectTrigger className="h-9 text-sm border-0 bg-transparent px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="livekit">LiveKit</SelectItem>
              <SelectItem value="pipecat">Pipecat</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row label="Hosting">
          <Select value={stack.hosting} onValueChange={(v) => onUpdate({ hosting: v as StackConfig['hosting'] })}>
            <SelectTrigger className="h-9 text-sm border-0 bg-transparent px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cloud">Cloud</SelectItem>
              <SelectItem value="self-hosted">Self-Hosted</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row label="Pipeline">
          <Select value={stack.pipeline} onValueChange={(v) => onUpdate({ pipeline: v as StackConfig['pipeline'] })}>
            <SelectTrigger className="h-9 text-sm border-0 bg-transparent px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stt-llm-tts">STT → LLM → TTS</SelectItem>
              <SelectItem value="speech-to-speech">Speech-to-Speech</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        {isSpeechToSpeech ? (
          <Row label="S2S Model">
            <Select value={stack.speechToSpeechModel} onValueChange={(v) => onUpdate({ speechToSpeechModel: v as StackConfig['speechToSpeechModel'] })}>
              <SelectTrigger className="h-9 text-sm border-0 bg-transparent px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {S2S_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="text-muted-foreground">{opt.provider}</span> {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
        ) : (
          <>
            <Row label="STT">
              <Select value={stack.sttModel} onValueChange={(v) => onUpdate({ sttModel: v as StackConfig['sttModel'] })}>
                <SelectTrigger className="h-9 text-sm border-0 bg-transparent px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(sttGroups).map(([provider, opts]) => (
                    <SelectGroup key={provider}>
                      <SelectLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{provider}</SelectLabel>
                      {opts.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="text-muted-foreground">{opt.provider}</span> {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Row>

            <Row label="LLM">
              <Select value={stack.llmModel} onValueChange={(v) => onUpdate({ llmModel: v as StackConfig['llmModel'] })}>
                <SelectTrigger className="h-9 text-sm border-0 bg-transparent px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(llmGroups).map(([provider, opts]) => (
                    <SelectGroup key={provider}>
                      <SelectLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{provider}</SelectLabel>
                      {opts.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="text-muted-foreground">{opt.provider}</span> {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Row>

            <Row label="TTS">
              <Select value={stack.ttsModel} onValueChange={(v) => onUpdate({ ttsModel: v as StackConfig['ttsModel'] })}>
                <SelectTrigger className="h-9 text-sm border-0 bg-transparent px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ttsGroups).map(([provider, opts]) => (
                    <SelectGroup key={provider}>
                      <SelectLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{provider}</SelectLabel>
                      {opts.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="text-muted-foreground">{opt.provider}</span> {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          </>
        )}

        <Row label="Calls">
          <Select value={stack.callMode} onValueChange={(v) => onUpdate({ callMode: v as StackConfig['callMode'] })}>
            <SelectTrigger className="h-9 text-sm border-0 bg-transparent px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="audio-only">Audio Only</SelectItem>
              <SelectItem value="audio-video">Audio + Video</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row label="Recording">
          <Select value={stack.recordingMode} onValueChange={(v) => onUpdate({ recordingMode: v as StackConfig['recordingMode'] })}>
            <SelectTrigger className="h-9 text-sm border-0 bg-transparent px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="audio-only">Audio Only</SelectItem>
              <SelectItem value="audio-video">Audio + Video</SelectItem>
            </SelectContent>
          </Select>
        </Row>
      </div>

      {/* Block warning */}
      {blockReason && (
        <div className="mx-4 my-3 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 flex gap-2.5">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive/90 leading-relaxed">{blockReason}</p>
        </div>
      )}

      {/* Cost Summary */}
      <div className="border-t border-border/50 px-4 py-4 space-y-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <CostPopoverLine label="Platform" amount={cost.platform} details={cost.details} category="Platform" />
          <CostPopoverLine label="Transport" amount={cost.transport} details={cost.details} category="Transport" />
          <CostPopoverLine label="Noise Cancel" amount={cost.noiseCancellation} details={cost.details} category="Noise Cancellation" />
          {isSpeechToSpeech ? (
            <CostPopoverLine label="S2S Model" amount={cost.llm} details={cost.details} category="S2S Model" />
          ) : (
            <>
              <CostPopoverLine label="STT" amount={cost.stt} details={cost.details} category="STT" />
              <CostPopoverLine label="LLM" amount={cost.llm} details={cost.details} category="LLM" />
              <CostPopoverLine label="TTS" amount={cost.tts} details={cost.details} category="TTS" />
            </>
          )}
          {cost.recording > 0 && (
            <CostPopoverLine label="Recording" amount={cost.recording} details={cost.details} category="Recording" />
          )}
        </div>

        {/* Total */}
        <div className="flex items-baseline justify-between pt-2 border-t border-border/30">
          <span className="text-sm font-medium text-muted-foreground">Total</span>
          <span className="font-mono text-xl font-bold tabular-nums" style={{ color: blockReason ? '#FF6B6B' : color }}>
            {blockReason ? 'N/A' : fmt(cost.total)}
          </span>
        </div>
        {Object.keys(cost.bestPlans).length > 0 && (
          <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground justify-end">
            {Object.entries(cost.bestPlans).map(([category, plan]) => (
              <span key={category}>
                {category}: <span className="text-foreground font-medium">{plan}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-1.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0 w-20">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function CostPopoverLine({ label, amount, details, category }: { label: string; amount: number; details: CostBreakdown['details']; category: string }) {
  return (
    <CellPopover details={details} category={category}>
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums text-foreground/80">{fmt(amount)}</span>
      </div>
    </CellPopover>
  );
}
