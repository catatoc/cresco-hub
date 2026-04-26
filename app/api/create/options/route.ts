import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { listSprints } from '@/lib/notion/sprints';
import { queryProjectsByCustomer } from '@/lib/notion/projects';
import { queryMembersByCustomerAndName } from '@/lib/notion/team';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';

export const dynamic = 'force-dynamic';

export type Option = { id: string; label: string; sublabel?: string };

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ctx = await resolveContext(user.email);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const q = url.searchParams.get('q') ?? '';

  let options: Option[] = [];
  if (type === 'sprint') {
    const sprints = await listSprints();
    options = sprints.map((s) => ({
      id: s.id,
      label: s.name,
      sublabel: s.status ?? undefined,
    }));
  } else if (type === 'project') {
    const projects = await queryProjectsByCustomer(ctx.customerId);
    options = projects.map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: p.icon ?? undefined,
    }));
  } else if (type === 'team') {
    const members = await queryMembersByCustomerAndName(ctx.customerId, q);
    options = members.map((m) => ({
      id: m.id,
      label: m.name,
      sublabel: m.email,
    }));
  } else if (type === 'meeting') {
    const meetings = await queryMeetingsByCustomer(ctx.customerId);
    options = meetings.map((m) => ({
      id: m.id,
      label: m.title,
      sublabel: m.date ?? undefined,
    }));
  } else {
    return NextResponse.json({ error: 'invalid-type' }, { status: 400 });
  }

  return NextResponse.json({ options });
}
