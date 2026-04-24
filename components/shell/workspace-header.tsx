import { ChevronDown } from 'lucide-react';

type Props = { name: string; icon: string | null };

export function WorkspaceHeader({ name, icon }: Props) {
  return (
    <div className="flex items-center gap-2 px-2 pb-2.5 pt-2 border-b border-border mb-2">
      <div className="w-[22px] h-[22px] rounded bg-gradient-to-br from-orange-400 to-pink-500 grid place-items-center text-white text-[11px] font-semibold shrink-0">
        {icon ?? name[0]?.toUpperCase() ?? '?'}
      </div>
      <span className="font-semibold text-[13px] flex-1 truncate">{name}</span>
      <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
    </div>
  );
}
