import { useMemo, useState, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import type { StackConfig, ChartPoint } from '@/data/types';
import { generateChartData, calculateCost } from '@/lib/cost-engine';
import { CHART_COLORS } from '@/data/compatibility';
import { RotateCcw, ExternalLink } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, annotationPlugin);

/* ── helpers ── */
function formatMinutes(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K` : String(n);
}

/** Generate denser chart points within a zoomed range so Chart.js doesn't interpolate across huge gaps. */
function generateDenseChartData(stack: StackConfig, basePoints: ChartPoint[], zoomMin: number, zoomMax: number): ChartPoint[] {
  // Start with the base points
  const existing = new Set(basePoints.map((p) => p.minutes));
  const extra: ChartPoint[] = [];

  // Add ~20 evenly-spaced points across the visible range
  const span = zoomMax - zoomMin;
  if (span > 0) {
    const step = span / 20;
    for (let i = 0; i <= 20; i++) {
      const minutes = Math.round(zoomMin + step * i);
      if (!existing.has(minutes)) {
        existing.add(minutes);
        extra.push({ minutes, cost: calculateCost(stack, minutes).total });
      }
    }
  }

  return [...basePoints, ...extra].sort((a, b) => a.minutes - b.minutes);
}

/* ── Navigator (TradingView-style minimap) ── */
interface NavigatorProps {
  /** Full chart data (same datasets used by the main chart) */
  chartData: {
    labels: number[];
    datasets: { label: string; data: number[]; borderColor: string }[];
  };
  /** 0-1 fraction for left edge */
  rangeLeft: number;
  /** 0-1 fraction for right edge */
  rangeRight: number;
  onChange: (left: number, right: number) => void;
  onReset: () => void;
  isZoomed: boolean;
  zoomMinLabel: string;
  zoomMaxLabel: string;
}

type DragMode = 'left' | 'right' | 'pan' | null;

function Navigator({ chartData, rangeLeft, rangeRight, onChange, onReset, isZoomed, zoomMinLabel, zoomMaxLabel }: NavigatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ mode: DragMode; startX: number; startLeft: number; startRight: number }>({
    mode: null, startX: 0, startLeft: 0, startRight: 0,
  });

  const MIN_RANGE = 0.03; // minimum selection width

  const getXFraction = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startLeft: rangeLeft, startRight: rangeRight };
  }, [rangeLeft, rangeRight]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const { mode, startX, startLeft, startRight } = dragRef.current;
    if (!mode) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (e.clientX - startX) / rect.width;

    if (mode === 'left') {
      const newLeft = Math.max(0, Math.min(startLeft + dx, startRight - MIN_RANGE));
      onChange(newLeft, rangeRight);
    } else if (mode === 'right') {
      const newRight = Math.min(1, Math.max(startRight + dx, startLeft + MIN_RANGE));
      onChange(rangeLeft, newRight);
    } else if (mode === 'pan') {
      const span = startRight - startLeft;
      let newLeft = startLeft + dx;
      let newRight = startRight + dx;
      if (newLeft < 0) { newLeft = 0; newRight = span; }
      if (newRight > 1) { newRight = 1; newLeft = 1 - span; }
      onChange(newLeft, newRight);
    }
  }, [rangeLeft, rangeRight, onChange]);

  const handlePointerUp = useCallback(() => {
    dragRef.current.mode = null;
  }, []);

  // Mini chart config — stripped down, no interactivity
  const miniData = useMemo(() => ({
    labels: chartData.labels,
    datasets: chartData.datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.borderColor + '80',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 0,
      pointHoverRadius: 0,
      tension: 0.3,
      fill: false,
    })),
  }), [chartData]);

  const miniOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    events: [] as ('mousemove' | 'click')[],
    interaction: { mode: 'nearest' as const },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      annotation: { annotations: {} },
    },
    scales: {
      x: {
        type: 'linear' as const,
        display: false,
      },
      y: {
        display: false,
      },
    },
  }), []);

  const leftPct = `${rangeLeft * 100}%`;
  const rightPct = `${(1 - rangeRight) * 100}%`;

  return (
    <div className="mt-6 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground/70 uppercase tracking-wider">Navigator</span>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            {zoomMinLabel} – {zoomMaxLabel} min
          </span>
          {isZoomed && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-accent/30 px-2.5 py-1 text-xs font-mono text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Minimap container */}
      <div
        ref={containerRef}
        className="relative h-[60px] rounded-lg border border-border/50 bg-card/80 overflow-hidden select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Mini chart background */}
        <div className="absolute inset-0 px-1">
          <Line data={miniData} options={miniOptions} />
        </div>

        {/* Left dimmed overlay */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-[#06070A]/60 backdrop-blur-[1px]"
          style={{ width: leftPct }}
          onPointerDown={(e) => {
            // Click outside selection — jump left edge
            const frac = getXFraction(e.clientX);
            onChange(frac, rangeRight);
          }}
        />

        {/* Right dimmed overlay */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-[#06070A]/60 backdrop-blur-[1px]"
          style={{ width: rightPct }}
          onPointerDown={(e) => {
            const frac = getXFraction(e.clientX);
            onChange(rangeLeft, frac);
          }}
        />

        {/* Selection window */}
        <div
          className="absolute top-0 bottom-0 cursor-grab active:cursor-grabbing"
          style={{ left: leftPct, right: rightPct }}
          onPointerDown={(e) => handlePointerDown(e, 'pan')}
        >
          {/* Top/bottom border of selection */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-neon/50" />
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-neon/50" />
        </div>

        {/* Left handle */}
        <div
          className="absolute top-0 bottom-0 w-[8px] cursor-ew-resize z-10 group"
          style={{ left: `calc(${leftPct} - 4px)` }}
          onPointerDown={(e) => handlePointerDown(e, 'left')}
        >
          <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-neon/70 group-hover:bg-neon transition-colors" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-[14px] rounded-full bg-neon" />
        </div>

        {/* Right handle */}
        <div
          className="absolute top-0 bottom-0 w-[8px] cursor-ew-resize z-10 group"
          style={{ left: `calc(${rangeRight * 100}% - 4px)` }}
          onPointerDown={(e) => handlePointerDown(e, 'right')}
        >
          <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-neon/70 group-hover:bg-neon transition-colors" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-[14px] rounded-full bg-neon" />
        </div>
      </div>

      {/* Axis labels */}
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground/50 px-0.5">
        <span>0</span>
        <span>20K</span>
        <span>40K</span>
        <span>60K</span>
        <span>80K</span>
        <span>100K</span>
      </div>
    </div>
  );
}

/* ── Main chart ── */

interface CostChartProps {
  stacks: StackConfig[];
  monthlyMinutes: number;
  focusedStackId: string | null;
  onFocusStack: (id: string | null) => void;
}

export function CostChart({ stacks, monthlyMinutes, focusedStackId, onFocusStack }: CostChartProps) {
  const visibleStacks = stacks.filter((s) => s.visible);

  // Range as 0-1 fractions of the full x-axis
  const [rangeLeft, setRangeLeft] = useState(0);
  const [rangeRight, setRangeRight] = useState(1);
  const isZoomed = rangeLeft > 0.001 || rangeRight < 0.999;

  const maxMinutes = 100000;
  const zoomMin = Math.round(rangeLeft * maxMinutes);
  const zoomMax = Math.round(rangeRight * maxMinutes);

  const handleRangeChange = useCallback((left: number, right: number) => {
    setRangeLeft(left);
    setRangeRight(right);
  }, []);

  const resetZoom = useCallback(() => {
    setRangeLeft(0);
    setRangeRight(1);
  }, []);

  // Base data series (sparse — used by navigator minimap)
  const baseSeriesData = useMemo(() => {
    return visibleStacks.map((stack, i) => ({
      stack,
      color: CHART_COLORS[i % CHART_COLORS.length],
      points: generateChartData(stack, monthlyMinutes),
    }));
  }, [visibleStacks, monthlyMinutes]);

  // Dense data series for the main chart when zoomed
  const mainSeriesData = useMemo(() => {
    if (!isZoomed) return baseSeriesData;
    return baseSeriesData.map((series) => ({
      ...series,
      points: generateDenseChartData(series.stack, series.points, zoomMin, zoomMax),
    }));
  }, [baseSeriesData, isZoomed, zoomMin, zoomMax]);

  // Navigator minimap data (always full range, sparse)
  const fullChartData = useMemo(() => ({
    labels: baseSeriesData[0]?.points.map((p) => p.minutes) ?? [],
    datasets: baseSeriesData.map((series) => ({
      label: series.stack.label,
      data: series.points.map((p) => p.cost),
      borderColor: series.color,
      backgroundColor: series.color + '18',
    })),
  }), [baseSeriesData]);

  // Main chart data — uses {x,y} point objects so the linear scale works properly
  const chartData = useMemo(() => ({
    datasets: mainSeriesData.map((series) => {
      const isFocused = !focusedStackId || focusedStackId === series.stack.id;
      return {
        label: series.stack.label,
        data: series.points.map((p) => ({ x: p.minutes, y: p.cost })),
        borderColor: series.color,
        backgroundColor: series.color + '18',
        borderWidth: isFocused ? 2.5 : 1,
        pointRadius: isFocused ? 4 : 0,
        pointHoverRadius: 7,
        pointBackgroundColor: series.color,
        pointBorderColor: '#06070A',
        pointBorderWidth: 2,
        tension: 0.3,
        fill: false,
        order: isFocused ? 0 : 1,
        borderDash: isFocused ? [] : [4, 4],
      };
    }),
  }), [mainSeriesData, focusedStackId]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      onClick: (_: unknown, elements: { datasetIndex: number }[]) => {
        if (elements.length > 0) {
          const idx = elements[0].datasetIndex;
          const stackId = visibleStacks[idx]?.id;
          onFocusStack(focusedStackId === stackId ? null : stackId);
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          align: 'end' as const,
          labels: {
            color: '#8891A5',
            font: { family: 'IBM Plex Mono', size: 13 },
            boxWidth: 14,
            boxHeight: 3,
            padding: 20,
            usePointStyle: false,
          },
          onClick: (_e: unknown, item: { datasetIndex?: number }) => {
            if (item.datasetIndex == null) return;
            const stackId = visibleStacks[item.datasetIndex]?.id;
            onFocusStack(focusedStackId === stackId ? null : stackId);
          },
        },
        tooltip: {
          backgroundColor: '#12151E',
          borderColor: '#1E2231',
          borderWidth: 1,
          titleColor: '#E8ECF4',
          bodyColor: '#C0C7D6',
          titleFont: { family: 'Outfit', size: 15, weight: 600 as const },
          bodyFont: { family: 'IBM Plex Mono', size: 13 },
          padding: 14,
          cornerRadius: 8,
          callbacks: {
            title(items: { parsed: { x: number | null } }[]) { return `${(items[0].parsed.x ?? 0).toLocaleString()} min/mo`; },
            label(item: { dataset: { label?: string }; parsed: { y: number | null } }) {
              return `  ${item.dataset.label ?? ''}: $${(item.parsed.y ?? 0).toFixed(2)}`;
            },
          },
        },
        annotation: {
          annotations: {
            currentMinutes: {
              type: 'line' as const,
              xMin: monthlyMinutes,
              xMax: monthlyMinutes,
              borderColor: '#06D6A066',
              borderWidth: 1,
              borderDash: [4, 4],
              label: {
                display: true,
                content: `${monthlyMinutes.toLocaleString()} min`,
                position: 'start' as const,
                backgroundColor: '#06D6A020',
                color: '#06D6A0',
                font: { family: 'IBM Plex Mono', size: 12 },
                padding: { top: 5, bottom: 5, left: 8, right: 8 },
                borderRadius: 4,
              },
            },
            ...((!isZoomed || zoomMax >= 80000) ? {
              enterpriseZone: {
                type: 'box' as const,
                xMin: 80000,
                backgroundColor: 'rgba(124, 92, 252, 0.045)',
                borderWidth: 0,
                label: {
                  display: true,
                  content: ['Enterprise plans', 'may lower costs here'],
                  position: { x: 'center' as const, y: 'start' as const },
                  color: '#7C5CFCBB',
                  font: { family: 'IBM Plex Mono', size: 11 },
                  padding: { top: 8, bottom: 4, left: 8, right: 8 },
                },
              },
              enterpriseLine: {
                type: 'line' as const,
                xMin: 80000,
                xMax: 80000,
                borderColor: '#7C5CFC30',
                borderWidth: 1.5,
                borderDash: [6, 4],
              },
            } : {}),
          },
        },
      },
      scales: {
        x: {
          type: 'linear' as const,
          min: isZoomed ? zoomMin : undefined,
          max: isZoomed ? zoomMax : undefined,
          title: {
            display: true,
            text: 'Monthly Minutes',
            color: '#565E73',
            font: { family: 'Outfit', size: 14 },
          },
          ticks: {
            color: '#565E73',
            font: { family: 'IBM Plex Mono', size: 12 },
            callback: (value: string | number) => {
              const v = Number(value);
              return v >= 1000 ? `${v / 1000}K` : v;
            },
          },
          grid: {
            color: '#1E223120',
            drawTicks: false,
          },
          border: { color: '#1E2231' },
        },
        y: {
          title: {
            display: true,
            text: 'Monthly Cost (USD)',
            color: '#565E73',
            font: { family: 'Outfit', size: 14 },
          },
          ticks: {
            color: '#565E73',
            font: { family: 'IBM Plex Mono', size: 12 },
            callback: (value: string | number) => `$${Number(value).toLocaleString()}`,
          },
          grid: {
            color: '#1E223120',
            drawTicks: false,
          },
          border: { color: '#1E2231' },
        },
      },
    }),
    [visibleStacks, monthlyMinutes, focusedStackId, onFocusStack, isZoomed, zoomMin, zoomMax]
  );

  return (
    <div className="relative rounded-xl border border-border bg-card/50 p-5 sm:p-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-tight">Cost Comparison</h2>
        <span className="text-sm text-muted-foreground font-mono">click line to focus</span>
      </div>
      {monthlyMinutes >= 100_000 && (
        <div className="mb-4 rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-2.5 flex items-start gap-2.5">
          <svg className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>
          <p className="text-sm text-violet-200/80 leading-relaxed">
            At <span className="font-medium text-violet-300">100K+ minutes/month</span>, enterprise plans typically offer volume discounts and dedicated support that can significantly lower your cost.{' '}
            <a href="https://livekit.io/contact-sales" target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-violet-300 hover:text-violet-200 underline underline-offset-2 decoration-violet-300/30 hover:decoration-violet-200/50 transition-colors">
              LiveKit Sales<ExternalLink className="h-3 w-3" />
            </a>
            {' '}/{' '}
            <a href="https://www.daily.co/company/contact/sales/" target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-violet-300 hover:text-violet-200 underline underline-offset-2 decoration-violet-300/30 hover:decoration-violet-200/50 transition-colors">
              Pipecat Sales<ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      )}

      <div className="h-[360px] sm:h-[440px]">
        <Line data={chartData} options={options} />
      </div>

      <Navigator
        chartData={fullChartData}
        rangeLeft={rangeLeft}
        rangeRight={rangeRight}
        onChange={handleRangeChange}
        onReset={resetZoom}
        isZoomed={isZoomed}
        zoomMinLabel={formatMinutes(zoomMin)}
        zoomMaxLabel={formatMinutes(zoomMax)}
      />
    </div>
  );
}
