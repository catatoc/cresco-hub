import { findMemberByEmail } from '@/lib/notion/team';
import { getClient } from '@/lib/notion/clients';

export type AppContext = {
  email: string;
  memberId: string;
  memberName: string;
  clientId: string;
  clientName: string;
  clientIcon: string | null;
  projectIds: string[];
  isAdmin: boolean;
};

export async function resolveContext(email: string | null): Promise<AppContext | null> {
  if (!email) return null;

  const member = await findMemberByEmail(email);
  if (!member || !member.clientId) return null;

  const client = await getClient(member.clientId);
  if (!client) return null;

  // TODO(v1.5): check app_admins table in Supabase
  const isAdmin = false;

  return {
    email,
    memberId: member.id,
    memberName: member.name,
    clientId: client.id,
    clientName: client.name,
    clientIcon: client.icon,
    projectIds: member.projectIds,
    isAdmin,
  };
}
