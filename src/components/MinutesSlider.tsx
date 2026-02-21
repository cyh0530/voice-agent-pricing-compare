import { useCallback, useMemo, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';

const TICKS = [1000, 5000, 10000, 25000, 50000, 100000];
const MIN_VAL = 500;
const MAX_VAL = 100000;
const SLIDER_MAX = 1000;

function valueToSlider(value: number): number {
  const logMin = Math.log(MIN_VAL);
  const logMax = Math.log(MAX_VAL);
  const logVal = Math.log(Math.max(MIN_VAL, Math.min(MAX_VAL, value)));
  return Math.round(((logVal - logMin) / (logMax - logMin)) * SLIDER_MAX);
}

function sliderToValue(slider: number): number {
  const logMin = Math.log(MIN_VAL);
  const logMax = Math.log(MAX_VAL);
  const logVal = logMin + (slider / SLIDER_MAX) * (logMax - logMin);
  const raw = Math.exp(logVal);
  if (raw < 2000) return Math.round(raw / 100) * 100;
  if (raw < 10000) return Math.round(raw / 500) * 500;
  return Math.round(raw / 1000) * 1000;
}

function tickPercent(tick: number): number {
  return (valueToSlider(tick) / SLIDER_MAX) * 100;
}

interface MinutesSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function MinutesSlider({ value, onChange }: MinutesSliderProps) {
  const formatNumber = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sliderPos = useMemo(() => valueToSlider(value), [value]);

  const handleSliderChange = useCallback(
    ([pos]: number[]) => {
      const newVal = sliderToValue(pos);
      if (newVal !== value) onChange(newVal);
    },
    [value, onChange]
  );

  const commitEdit = useCallback(() => {
    setEditing(false);
    const parsed = parseInt(draft.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed)) return;
    const clamped = Math.max(MIN_VAL, parsed);
    if (clamped !== value) onChange(clamped);
  }, [draft, value, onChange]);

  const formatWithCommas = (n: string) => {
    const digits = n.replace(/[^0-9]/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const startEdit = useCallback(() => {
    setDraft(value.toLocaleString());
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        setEditing(false);
      }
    },
    [commitEdit]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-base font-medium text-muted-foreground">Monthly Minutes</label>
        <div className="flex items-baseline gap-2">
          {editing ? (
            <div className="relative inline-grid items-baseline">
              <span className="invisible col-start-1 row-start-1 whitespace-pre font-mono text-3xl font-semibold tabular-nums px-px">
                {draft || '\u00A0'}
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(formatWithCommas(e.target.value))}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                className="col-start-1 row-start-1 min-w-[2ch] bg-transparent text-right font-mono text-3xl font-semibold text-neon tabular-nums outline-none border-b-2 border-neon/50"
              />
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="font-mono text-3xl font-semibold text-neon tabular-nums cursor-text border-b-2 border-dashed border-neon/25 hover:border-neon/50 transition-colors"
            >
              {value.toLocaleString()}
            </button>
          )}
          <span className="text-sm text-muted-foreground">min/mo</span>
        </div>
      </div>

      <Slider
        min={0}
        max={SLIDER_MAX}
        step={1}
        value={[sliderPos]}
        onValueChange={handleSliderChange}
        className="w-full"
      />

      <div className="relative h-6">
        {TICKS.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`absolute -translate-x-1/2 text-sm font-mono transition-colors cursor-pointer ${
              value === t
                ? 'text-neon'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ left: `${tickPercent(t)}%` }}
          >
            {formatNumber(t)}
          </button>
        ))}
      </div>

      {value >= 100000 && (
        <p className="text-xs text-violet-400/70 font-mono text-right animate-fade-in">
          Need more? Enterprise plans offer volume discounts.
        </p>
      )}
    </div>
  );
}
