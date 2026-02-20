import { useMemo } from 'react';
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
import type { StackConfig } from '@/data/types';
import { generateChartData } from '@/lib/cost-engine';
import { CHART_COLORS } from '@/data/compatibility';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, annotationPlugin);

interface CostChartProps {
  stacks: StackConfig[];
  monthlyMinutes: number;
  focusedStackId: string | null;
  onFocusStack: (id: string | null) => void;
}

export function CostChart({ stacks, monthlyMinutes, focusedStackId, onFocusStack }: CostChartProps) {
  const visibleStacks = stacks.filter((s) => s.visible);

  const chartData = useMemo(() => {
    const seriesData = visibleStacks.map((stack, i) => ({
      stack,
      color: CHART_COLORS[i % CHART_COLORS.length],
      points: generateChartData(stack, monthlyMinutes),
    }));

    return {
      labels: seriesData[0]?.points.map((p) => p.minutes) ?? [],
      datasets: seriesData.map((series) => {
        const isFocused = !focusedStackId || focusedStackId === series.stack.id;
        return {
          label: series.stack.label,
          data: series.points.map((p) => p.cost),
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
    };
  }, [visibleStacks, focusedStackId, monthlyMinutes]);

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
          },
        },
      },
      scales: {
        x: {
          type: 'linear' as const,
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
    [visibleStacks, monthlyMinutes, focusedStackId, onFocusStack]
  );

  return (
    <div className="relative rounded-xl border border-border bg-card/50 p-5 sm:p-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-tight">Cost Comparison</h2>
        <span className="text-sm text-muted-foreground font-mono">click line to focus</span>
      </div>
      <div className="h-[360px] sm:h-[440px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
