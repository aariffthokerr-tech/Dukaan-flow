import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: number;
  helperText: string;
  icon: LucideIcon;
  accent?: 'default' | 'green' | 'amber';
  isLoading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  helperText,
  icon: Icon,
  accent = 'default',
  isLoading = false,
}) => {
  const iconTone =
    accent === 'green'
      ? 'text-emerald-700 bg-emerald-50'
      : accent === 'amber'
        ? 'text-amber-700 bg-amber-50'
        : 'text-neutral-700 bg-neutral-100';

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2.5">
        <p className="text-xs font-medium text-neutral-600">{label}</p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone} shrink-0`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded-md bg-neutral-200" />
      ) : (
        <p className="mt-3 font-mono text-2xl font-semibold tracking-tight text-neutral-900 tabular-nums">
          {value}
        </p>
      )}

      <p className="mt-1.5 text-xs text-neutral-500">{helperText}</p>
    </div>
  );
};
