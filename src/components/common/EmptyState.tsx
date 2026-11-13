import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  borderless?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  borderless = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        borderless
          ? 'px-4 py-8'
          : 'rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70 px-6 py-10'
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-display text-sm font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-neutral-600 leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
