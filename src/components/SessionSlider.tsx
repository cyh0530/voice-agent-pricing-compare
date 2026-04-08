import { useCallback, useMemo, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';

const TICKS = [5, 10, 15, 20, 30];
const MIN_VAL = 1;
const MAX_VAL = 60;

interface SessionSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function SessionSlider({ value, onChange }: SessionSliderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sliderPos = useMemo(() => value, [value]);

  const handleSliderChange = useCallback(
    ([pos]: number[]) => {
      if (pos !== value) onChange(pos);
    },
    [value, onChange]
  );

  const commitEdit = useCallback(() => {
    setEditing(false);
    const parsed = parseInt(draft.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed)) return;
    const clamped = Math.max(MIN_VAL, Math.min(MAX_VAL, parsed));
    if (clamped !== value) onChange(clamped);
  }, [draft, value, onChange]);

  const startEdit = useCallback(() => {
    setDraft(String(value));
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

  const tickPercent = (tick: number) => ((tick - MIN_VAL) / (MAX_VAL - MIN_VAL)) * 100;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-base font-medium text-muted-foreground">Avg Session Length</label>
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
                onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
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
              {value}
            </button>
          )}
          <span className="text-sm text-muted-foreground">min</span>
        </div>
      </div>

      <Slider
        min={MIN_VAL}
        max={MAX_VAL}
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
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
