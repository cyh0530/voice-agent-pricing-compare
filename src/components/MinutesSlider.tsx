import { useCallback, useMemo } from 'react';
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

  const sliderPos = useMemo(() => valueToSlider(value), [value]);

  const handleSliderChange = useCallback(
    ([pos]: number[]) => {
      const newVal = sliderToValue(pos);
      if (newVal !== value) onChange(newVal);
    },
    [value, onChange]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between gap-4">
        <label className="text-base font-medium text-muted-foreground">Monthly Minutes</label>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-semibold text-neon tabular-nums">
            {value.toLocaleString()}
          </span>
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
    </div>
  );
}
