import { cookies } from 'next/headers';
import { findMemberByEmail } from '@/lib/notion/team';
import { getCustomers } from '@/lib/notion/customers';
import type { CustomerIcon } from '@/schemas/customer';

export const SELECTED_CUSTOMER_COOKIE = 'selected-customer-id';

// dominio interno del estudio — todo lo demás es un cliente y ve el portal
const INTERNAL_DOMAIN = '@cresco.so';

export type CustomerSummary = {
  id: string;
  name: string;
  icon: CustomerIcon | null;
};

export type AppContext = {
  email: string;
  memberId: string;
  memberName: string;
  memberGender: 'Male' | 'Female' | null;
  customerId: string;
  customerName: string;
  customerIcon: CustomerIcon | null;
  customerLogo: string | null;
  customers: CustomerSummary[];
  projectIds: string[];
  isAdmin: boolean;
  /** true = equipo crescō (hub interno) · false = cliente (ve el portal) */
  isInternal: boolean;
  /** checkbox "Portal Sign In" en Team — false = nunca ha entrado al portal (ve la bienvenida) */
  portalSignIn: boolean;
  /** checkbox "Portal Onboarding Check" en Team — false = no ha visto el tour del portal */
  portalOnboarding: boolean;
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
    memberGender: member.gender,
    customerId: active.id,
    customerName: active.name,
    customerIcon: active.icon,
    customerLogo: active.logo,
    customers: customers.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
    projectIds: member.projectIds,
    isAdmin,
    isInternal: email.toLowerCase().endsWith(INTERNAL_DOMAIN),
    portalSignIn: member.portalSignIn,
    portalOnboarding: member.portalOnboarding,
  };
}
