import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className,
      )}
    >
      <div className="empty-bob w-12 h-12 rounded-xl bg-gradient-to-br from-[#eef4ff] to-[#f4ecf8] flex items-center justify-center text-2xl mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
