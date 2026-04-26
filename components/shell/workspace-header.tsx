'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { CustomerSummary } from '@/lib/auth/context';

type Props = {
  current: CustomerSummary;
  customers: CustomerSummary[];
};

function CustomerBadge({ customer }: { customer: CustomerSummary }) {
  return (
    <>
      <div className="w-[22px] h-[22px] rounded-[5px] bg-gradient-to-br from-orange-400 to-pink-500 grid place-items-center text-white text-[11px] font-semibold shrink-0 overflow-hidden">
        {customer.icon?.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={customer.icon.value} alt="" className="w-full h-full object-cover" />
        ) : (
          (customer.icon?.value ?? customer.name[0]?.toUpperCase() ?? '?')
        )}
      </div>
      <span className="font-semibold text-[13px] flex-1 truncate text-left">{customer.name}</span>
    </>
  );
}

export function WorkspaceHeader({ current, customers }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (customers.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-2 pb-2.5 pt-2 border-b border-border mb-2">
        <CustomerBadge customer={current} />
      </div>
    );
  }

  async function selectCustomer(customerId: string) {
    if (customerId === current.id || pendingId) return;
    setPendingId(customerId);
    try {
      const res = await fetch('/api/auth/select-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      if (!res.ok) throw new Error('select-customer failed');
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="border-b border-border mb-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="w-full flex items-center gap-2 px-2 pb-2.5 pt-2 rounded-md hover:bg-muted/60 transition-colors outline-none"
          disabled={pendingId !== null}
        >
          <CustomerBadge customer={current} />
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[220px]">
          {customers.map((c) => (
            <DropdownMenuItem
              key={c.id}
              onClick={() => selectCustomer(c.id)}
              className="flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-[4px] bg-gradient-to-br from-orange-400 to-pink-500 grid place-items-center text-white text-[10px] font-semibold shrink-0 overflow-hidden">
                {c.icon?.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.icon.value} alt="" className="w-full h-full object-cover" />
                ) : (
                  (c.icon?.value ?? c.name[0]?.toUpperCase() ?? '?')
                )}
              </div>
              <span className="flex-1 truncate text-[13px]">{c.name}</span>
              {c.id === current.id && <Check className="w-3.5 h-3.5 text-muted-foreground" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
