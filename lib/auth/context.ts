import { findMemberByEmail } from '@/lib/notion/team';
import { getCustomer } from '@/lib/notion/customers';

export type AppContext = {
  email: string;
  memberId: string;
  memberName: string;
  customerId: string;
  customerName: string;
  customerIcon: string | null;
  projectIds: string[];
  isAdmin: boolean;
};

export async function resolveContext(email: string | null): Promise<AppContext | null> {
  if (!email) return null;

  const member = await findMemberByEmail(email);
  if (!member) return null;

  const firstCustomerId = member.customerIds[0];
  if (!firstCustomerId) return null;

  const customer = await getCustomer(firstCustomerId);
  if (!customer) return null;

  // TODO(v1.5): check app_admins table in Supabase
  const isAdmin = false;

  return {
    email,
    memberId: member.id,
    memberName: member.name,
    customerId: customer.id,
    customerName: customer.name,
    customerIcon: customer.icon,
    projectIds: member.projectIds,
    isAdmin,
  };
}
