import { MoreHorizontal } from 'lucide-react';

type Props = { name: string; role: string };

export function UserCard({ name, role }: Props) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 p-2 border-t border-border mt-1">
      <div className="w-6 h-6 rounded-full bg-[#8ba1d9] text-white grid place-items-center text-[11px] font-semibold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium truncate">{name}</div>
        <div className="text-[11px] text-muted-foreground truncate">{role}</div>
      </div>
      <MoreHorizontal className="w-3 h-3 text-muted-foreground shrink-0" />
    </div>
  );
}
