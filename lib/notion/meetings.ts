import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { meetingSchema, type Meeting } from '@/schemas/meeting';

function parseMeeting(row: any): Meeting {
  const p = row.properties as Record<string, any>;
  return meetingSchema.parse({
    id: row.id,
    title: p.Name?.title?.[0]?.plain_text ?? '',
    createdTime: row.created_time,
    date: p.Date?.date?.start ?? null,
    endDate: p.Date?.date?.end ?? null,
    meetingType: p['Meeting type']?.select?.name ?? null,
    summary:
      ((p.Summary?.rich_text ?? []) as Array<{ plain_text: string }>)
        .map((t) => t.plain_text)
        .join('')
        .trim() || null,
    attendeeIds: (p.Attendees?.people ?? []).map((u: { id: string }) => u.id),
    customerId: p.Customer?.relation?.[0]?.id ?? null,
    projectIds: (p.Projects?.relation ?? []).map((r: { id: string }) => r.id),
    teamIds: (p.Team?.relation ?? []).map((r: { id: string }) => r.id),
    taskIds: (p.Tasks?.relation ?? []).map((r: { id: string }) => r.id),
    wikiIds: (p.Wiki?.relation ?? []).map((r: { id: string }) => r.id),
    url: row.url,
  });
}

export async function queryMeetingsByCustomer(customerId: string): Promise<Meeting[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_MEETINGS,
    filter: { property: 'Customer', relation: { contains: customerId } },
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseMeeting);
}

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: meetingId });
    if (!('properties' in page)) return null;
    return parseMeeting(page);
  } catch {
    return null;
  }
}

export async function queryMeetingsByCustomerAndTitle(
  customerId: string,
  term: string,
): Promise<Meeting[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_MEETINGS,
    page_size: 8,
    filter: {
      and: [
        { property: 'Customer', relation: { contains: customerId } },
        { property: 'Name', title: { contains: term } },
      ],
    },
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseMeeting);
}

export async function queryMeetingsByProject(projectId: string): Promise<Meeting[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_MEETINGS,
    filter: { property: 'Projects', relation: { contains: projectId } },
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseMeeting);
}
