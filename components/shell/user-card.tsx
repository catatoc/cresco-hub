'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

type Props = { name: string; role: string };

export function UserCard({ name, role }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function signOut() {
    if (pending) return;
    setPending(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 border-t border-border mt-1">
      <div className="w-6 h-6 rounded-full bg-[#8ba1d9] text-white grid place-items-center text-[11px] font-semibold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium truncate">{name}</div>
        <div className="text-[11px] text-muted-foreground truncate">{role}</div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="w-9 h-9 -m-2 grid place-items-center rounded hover:bg-muted/60 outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          aria-label="Opciones de usuario"
          disabled={pending}
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-[13px]">
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
