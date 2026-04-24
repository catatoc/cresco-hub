/**
 * Smoke test — verifies every Notion service parses real data.
 *
 * Run: `npx tsx scripts/smoke.ts`
 *   (or `npm run smoke`)
 *
 * Requires `.env.local` with real NOTION_API_KEY and all NOTION_DB_* IDs.
 * Prints the first parsed row from each service or an error.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { findMemberByEmail } from '@/lib/notion/team';
import { getCustomer } from '@/lib/notion/customers';
import { getCurrentSprint, listSprints } from '@/lib/notion/sprints';
import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { queryProjectsByCustomer } from '@/lib/notion/projects';
import { queryWikiByCustomer } from '@/lib/notion/wiki';
import { getUser } from '@/lib/notion/users';

const TEST_EMAIL = process.env.SMOKE_TEST_EMAIL ?? 'catatocarrasquero@gmail.com';

function log(step: string, ok: boolean, detail: string) {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${step.padEnd(40)} ${detail}`);
}

async function run() {
  console.log(`\n🔬 Smoke test — email: ${TEST_EMAIL}\n`);

  // 1. findMemberByEmail
  const member = await findMemberByEmail(TEST_EMAIL).catch((e) => ({ __error: e as Error }));
  if (member && typeof member === 'object' && '__error' in member) {
    log('findMemberByEmail', false, (member.__error as Error).message);
    return;
  }
  if (!member) {
    log('findMemberByEmail', false, 'no member found for email');
    return;
  }
  log(
    'findMemberByEmail',
    true,
    `${member.name} · customers=${member.customerIds.length} projects=${member.projectIds.length}`,
  );

  // 2. getCustomer (first customer)
  const customerId = member.customerIds[0];
  if (!customerId) {
    log('getCustomer', false, 'member has no customers');
    return;
  }
  const customer = await getCustomer(customerId).catch((e) => ({ __error: e as Error }));
  if (!customer || (typeof customer === 'object' && '__error' in customer)) {
    const msg =
      customer && typeof customer === 'object' && '__error' in customer
        ? (customer.__error as Error).message
        : 'null';
    log('getCustomer', false, msg);
    return;
  }
  log(
    'getCustomer',
    true,
    `${customer.name} · status=${customer.status ?? 'none'} · icon=${customer.icon ?? 'none'}`,
  );

  // 3. Current Sprint
  const sprint = await getCurrentSprint().catch((e) => ({ __error: e as Error }));
  let sprintId: string | null = null;
  if (sprint && typeof sprint === 'object' && '__error' in sprint) {
    log('getCurrentSprint', false, (sprint.__error as Error).message);
  } else if (!sprint) {
    log('getCurrentSprint', false, 'no sprint with status=Current');
  } else {
    sprintId = sprint.id;
    log(
      'getCurrentSprint',
      true,
      `${sprint.name} · #${sprint.sprintId ?? '?'} · ${sprint.startDate} → ${sprint.endDate}`,
    );
  }

  const allSprints = await listSprints().catch(() => [] as any[]);
  log('listSprints', Array.isArray(allSprints), `${allSprints.length} sprints`);

  // 4. Tasks
  const tasksResult = await queryTasksByCustomerAndSprint(customer.id, sprintId).catch(
    (e) => ({ __error: e as Error }),
  );
  let tasksArr: any[] = [];
  if (tasksResult && typeof tasksResult === 'object' && '__error' in tasksResult) {
    log('queryTasksByCustomerAndSprint', false, (tasksResult.__error as Error).message);
  } else {
    tasksArr = tasksResult as any[];
    log('queryTasksByCustomerAndSprint', true, `${tasksArr.length} tasks`);
    const first = tasksArr[0];
    if (first)
      console.log(
        `   ↳ sample: "${first.title}" · ${first.status} · ${first.priority ?? 'no priority'}`,
      );
  }

  // 5. Meetings
  const meetingsResult = await queryMeetingsByCustomer(customer.id).catch(
    (e) => ({ __error: e as Error }),
  );
  if (meetingsResult && typeof meetingsResult === 'object' && '__error' in meetingsResult) {
    log('queryMeetingsByCustomer', false, (meetingsResult.__error as Error).message);
  } else {
    const arr = meetingsResult as any[];
    log('queryMeetingsByCustomer', true, `${arr.length} meetings`);
    const first = arr[0];
    if (first) console.log(`   ↳ sample: "${first.title}" · ${first.date ?? 'no date'}`);
  }

  // 6. Projects
  const projectsResult = await queryProjectsByCustomer(customer.id).catch(
    (e) => ({ __error: e as Error }),
  );
  if (projectsResult && typeof projectsResult === 'object' && '__error' in projectsResult) {
    log('queryProjectsByCustomer', false, (projectsResult.__error as Error).message);
  } else {
    const arr = projectsResult as any[];
    log('queryProjectsByCustomer', true, `${arr.length} projects`);
    const first = arr[0];
    if (first)
      console.log(
        `   ↳ sample: "${first.name}" · ${first.status ?? '?'} · ${Math.round((first.completion ?? 0) * 100)}%`,
      );
  }

  // 7. Wiki
  const wikiResult = await queryWikiByCustomer(customer.id).catch(
    (e) => ({ __error: e as Error }),
  );
  if (wikiResult && typeof wikiResult === 'object' && '__error' in wikiResult) {
    log('queryWikiByCustomer', false, (wikiResult.__error as Error).message);
  } else {
    const arr = wikiResult as any[];
    log('queryWikiByCustomer', true, `${arr.length} wiki pages`);
    const first = arr[0];
    if (first)
      console.log(
        `   ↳ sample: "${first.title}" · categories=${first.categories.join(',') || 'none'}`,
      );
  }

  // 8. User resolution
  const firstTask = tasksArr[0];
  if (firstTask?.assigneeIds?.[0]) {
    const u = await getUser(firstTask.assigneeIds[0]).catch(() => null);
    log(
      'getUser (first assignee)',
      !!u,
      u ? `${u.name ?? 'anonymous'} · ${u.email ?? 'no email'}` : 'failed',
    );
  }

  console.log(`\n🎉 Smoke test complete.\n`);
}

run().catch((e) => {
  console.error('💥 Unhandled error:', e);
  process.exit(1);
});
