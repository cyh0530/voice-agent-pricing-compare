import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StackColumn } from './StackColumn';
import type { StackConfig, CostBreakdown } from '@/data/types';
import { calculateCost } from '@/lib/cost-engine';

interface ComparisonTableProps {
  stacks: StackConfig[];
  monthlyMinutes: number;
  focusedStackId: string | null;
  onUpdateStack: (id: string, updates: Partial<StackConfig>) => void;
  onRemoveStack: (id: string) => void;
  onAddStack: () => void;
  onFocusStack: (id: string | null) => void;
}

export function ComparisonTable({
  stacks,
  monthlyMinutes,
  focusedStackId,
  onUpdateStack,
  onRemoveStack,
  onAddStack,
  onFocusStack,
}: ComparisonTableProps) {
  const costs: Record<string, CostBreakdown> = useMemo(() => {
    const map: Record<string, CostBreakdown> = {};
    for (const stack of stacks) {
      map[stack.id] = calculateCost(stack, monthlyMinutes);
    }
    return map;
  }, [stacks, monthlyMinutes]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold tracking-tight">Stack Comparison</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-mono">
            {stacks.length}/8 stacks
          </span>
          {stacks.length < 8 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddStack}
              className="gap-2 text-sm border-border hover:border-neon/30 hover:text-neon transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Stack
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        {stacks.length > 4 && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-background to-transparent z-10" />
        )}
        <div className={`${stacks.length > 4 ? 'overflow-x-auto pb-2 -mx-2 px-2' : ''}`}>
          <div className="grid gap-4" style={{
            gridTemplateColumns: `repeat(${stacks.length}, minmax(260px, 1fr))`,
          }}>
            {stacks.map((stack, i) => (
              <StackColumn
                key={stack.id}
                stack={stack}
                index={i}
                cost={costs[stack.id]}
                isFocused={focusedStackId === stack.id || focusedStackId === null}
                onUpdate={(updates) => onUpdateStack(stack.id, updates)}
                onRemove={() => onRemoveStack(stack.id)}
                onFocus={() => onFocusStack(focusedStackId === stack.id ? null : stack.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
