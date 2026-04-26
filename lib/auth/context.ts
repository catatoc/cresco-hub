import { cookies } from 'next/headers';
import { findMemberByEmail } from '@/lib/notion/team';
import { getCustomers } from '@/lib/notion/customers';
import type { CustomerIcon } from '@/schemas/customer';

export const SELECTED_CUSTOMER_COOKIE = 'selected-customer-id';
export const TAREAS_SCOPE_COOKIE = 'tareas-scope';
export type TareasScope = 'mine' | 'team';

export type CustomerSummary = {
  id: string;
  name: string;
  icon: CustomerIcon | null;
};

export type AppContext = {
  email: string;
  memberId: string;
  memberName: string;
  customerId: string;
  customerName: string;
  customerIcon: CustomerIcon | null;
  customers: CustomerSummary[];
  projectIds: string[];
  isAdmin: boolean;
};

export async function resolveContext(email: string | null): Promise<AppContext | null> {
  if (!email) return null;

  const member = await findMemberByEmail(email);
  if (!member) return null;

  if (member.customerIds.length === 0) return null;

  const customers = await getCustomers(member.customerIds);
  if (customers.length === 0) return null;

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(SELECTED_CUSTOMER_COOKIE)?.value;
  const active =
    (selectedId ? customers.find((c) => c.id === selectedId) : undefined) ?? customers[0]!;

  // TODO(v1.5): check app_admins table in Supabase
  const isAdmin = false;

  return {
    email,
    memberId: member.id,
    memberName: member.name,
    customerId: active.id,
    customerName: active.name,
    customerIcon: active.icon,
    customers: customers.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
    projectIds: member.projectIds,
    isAdmin,
  };
}
