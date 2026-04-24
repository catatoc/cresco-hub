import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { meetingSchema, type Meeting } from '@/schemas/meeting';

export async function queryMeetingsByClient(clientId: string): Promise<Meeting[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_MEETINGS,
    filter: { property: 'Client', relation: { contains: clientId } },
    sorts: [{ property: 'Date', direction: 'descending' }],
  });

  return res.results
    .filter((row): row is any => 'properties' in row)
    .map((row) => {
      const p = row.properties as Record<string, any>;
      return meetingSchema.parse({
        id: row.id,
        title: p.Title?.title?.[0]?.plain_text ?? '',
        date: p.Date?.date?.start ?? null,
        endDate: p.Date?.date?.end ?? null,
        meetUrl: p['Meet URL']?.url ?? null,
        recurrence: p.Recurrence?.rich_text?.[0]?.plain_text ?? null,
        facilitatorId: p.Facilitator?.relation?.[0]?.id ?? null,
        attendeeIds: (p.Attendees?.relation ?? []).map((r: { id: string }) => r.id),
        clientId: p.Client?.relation?.[0]?.id ?? null,
        actionItemIds: (p['Action items']?.relation ?? []).map((r: { id: string }) => r.id),
        url: row.url,
      });
    });
}

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: meetingId });
    if (!('properties' in page)) return null;
    const p = page.properties as Record<string, any>;
    return meetingSchema.parse({
      id: page.id,
      title: p.Title?.title?.[0]?.plain_text ?? '',
      date: p.Date?.date?.start ?? null,
      endDate: p.Date?.date?.end ?? null,
      meetUrl: p['Meet URL']?.url ?? null,
      recurrence: p.Recurrence?.rich_text?.[0]?.plain_text ?? null,
      facilitatorId: p.Facilitator?.relation?.[0]?.id ?? null,
      attendeeIds: (p.Attendees?.relation ?? []).map((r: { id: string }) => r.id),
      clientId: p.Client?.relation?.[0]?.id ?? null,
      actionItemIds: (p['Action items']?.relation ?? []).map((r: { id: string }) => r.id),
      url: (page as any).url,
    });
  } catch {
    return null;
  }
}
