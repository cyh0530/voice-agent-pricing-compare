import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExternalLink } from 'lucide-react';
import type { CostDetail } from '@/data/types';

interface CellPopoverProps {
  children: React.ReactNode;
  details: CostDetail[];
  category: string;
}

function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function CellPopover({ children, details, category }: CellPopoverProps) {
  const relevant = details.filter((d) => d.category === category);

  if (relevant.length === 0) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="w-full text-left cursor-help group/cell transition-colors hover:bg-accent/50 rounded px-2 py-1.5 -mx-2 -my-1.5">
          {children}
          <span className="ml-1 inline-block text-xs text-muted-foreground opacity-0 group-hover/cell:opacity-100 transition-opacity">
            ⓘ
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 border-border bg-popover p-0 shadow-xl shadow-black/40"
        side="top"
        sideOffset={8}
      >
        <div className="border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">{category} Breakdown</h4>
        </div>
        <div className="divide-y divide-border/50">
          {relevant.map((detail, i) => (
            <div key={i} className="px-4 py-3 space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-muted-foreground truncate">{detail.label}</span>
                <span className="font-mono text-base font-medium text-neon tabular-nums shrink-0">
                  ${detail.amount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground/70 leading-relaxed break-all">
                {detail.formula}
              </p>
              {detail.sourceUrl && (
                <a
                  href={detail.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-neon/70 hover:text-neon transition-colors"
                >
                  {sourceDomain(detail.sourceUrl)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
