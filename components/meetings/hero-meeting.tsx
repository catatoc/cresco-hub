import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExternalLink, Users } from 'lucide-react';
import type { Meeting } from '@/schemas/meeting';
import type { NotionUser } from '@/schemas/notion-user';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { AssigneeAvatar } from '@/components/kanban/card';
import { LiveBadge, isLive } from './live-badge';
import { ActionItems } from './action-items';

type Props = {
  meeting: Meeting;
  blocks: any[];
  actionItems: Task[];
  attendees: NotionUser[];
  teamMembers: TeamMember[];
  usersById: Map<string, NotionUser>;
};

export function HeroMeeting({
  meeting,
  blocks,
  actionItems,
  attendees,
  teamMembers,
  usersById,
}: Props) {
  const now = new Date();
  const start = meeting.date ? parseISO(meeting.date) : null;
  const end = meeting.endDate ? parseISO(meeting.endDate) : null;
  const live = isLive({ now, start, end });
  const fmtTime = (d: Date) => format(d, 'h:mmaaa').replace(/\s/g, '');

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-[#dfe1f2] bg-gradient-to-b from-[#fbfcff] to-white p-6 mb-7">
        <div className="absolute top-0 right-0 w-[180px] h-[180px] bg-[radial-gradient(circle_at_top_right,rgba(94,106,210,0.1),transparent_60%)] pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            {live && <LiveBadge />}
            <span className="text-[12px] text-muted-foreground font-medium">
              {start && format(start, "EEEE · d 'de' MMMM · 'Semana' w", { locale: es })}
            </span>
            {meeting.meetingType && (
              <span className="inline-flex items-center px-1.5 py-[1px] rounded text-[11px] font-medium bg-[#eeeffc] text-[#5e6ad2]">
                {meeting.meetingType}
              </span>
            )}
          </div>

          <h1 className="text-[22px] font-semibold tracking-[-0.01em] mb-3.5">{meeting.title}</h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 p-3.5 bg-white border border-border rounded-lg mb-4 text-[12px]">
            {start && (
              <MetaItem
                label="Hora"
                value={`${fmtTime(start)}${end ? ` → ${fmtTime(end)}` : ''}`}
              />
            )}

            {attendees.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.03em] font-medium text-muted-foreground">
                  Asistentes
                </span>
                <div className="flex -space-x-1.5">
                  {attendees.slice(0, 6).map((u) => (
                    <div
                      key={u.id}
                      className="ring-2 ring-white rounded-full"
                      title={u.name ?? undefined}
                    >
                      <AssigneeAvatar user={u} size={22} />
                    </div>
                  ))}
                  {attendees.length > 6 && (
                    <span className="text-[11px] text-muted-foreground ml-2 self-center">
                      +{attendees.length - 6}
                    </span>
                  )}
                </div>
              </div>
            )}

            {teamMembers.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.03em] font-medium text-muted-foreground">
                  <Users className="w-3 h-3" />
                  Equipo
                </span>
                <div className="flex flex-wrap gap-1">
                  {teamMembers.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 px-2 py-[1px] rounded text-[11px] font-medium bg-[#f7f7f8] text-[#57575c] border border-border"
                      title={m.email}
                    >
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <a
              href={meeting.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-medium border border-border bg-white hover:bg-[#f7f7f8]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir en Notion
            </a>
          </div>
        </div>
      </div>

      {blocks.length > 0 && (
        <section className="mb-7">
          <SectionHead title="Agenda" count={`${blocks.length} bloques`} />
          <div className="border border-border rounded-lg bg-white p-4">
            <BlocksRenderer blocks={blocks} />
          </div>
        </section>
      )}

      {actionItems.length > 0 && (
        <section className="mb-7">
          <SectionHead title="Tareas de esta reunión" count={`${actionItems.length} vinculadas`} />
          <ActionItems tasks={actionItems} usersById={usersById} />
        </section>
      )}
    </>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.03em] font-medium text-muted-foreground">{label}</span>
      <span className="text-[12px] font-medium">{value}</span>
    </div>
  );
}

function SectionHead({ title, count }: { title: string; count?: string }) {
  return (
    <div className="flex items-baseline gap-2.5 mb-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">{title}</h2>
      {count && <span className="text-[12px] text-muted-foreground">{count}</span>}
    </div>
  );
}
