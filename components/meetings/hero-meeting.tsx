import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import type { Meeting } from '@/schemas/meeting';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { AssigneeAvatar } from '@/components/kanban/card';
import { cn } from '@/lib/utils';
import { LiveBadge, isLive } from './live-badge';
import { ActionItems } from './action-items';

type Props = {
  meeting: Meeting;
  blocks: any[];
  actionItems: Task[];
  membersById: Map<string, TeamMember>;
};

export function HeroMeeting({ meeting, blocks, actionItems, membersById }: Props) {
  const now = new Date();
  const created = parseISO(meeting.createdTime);
  const start = meeting.date ? parseISO(meeting.date) : null;
  const end = meeting.endDate ? parseISO(meeting.endDate) : null;
  const live = isLive({ now, start, end });
  const fmtTime = (d: Date) => format(d, 'h:mmaaa').replace(/\s/g, '');

  const attendees = meeting.teamIds
    .map((id) => membersById.get(id))
    .filter((m): m is TeamMember => !!m);

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-[#dfe1f2] bg-gradient-to-b from-[#fbfcff] to-white p-4 sm:p-5 lg:p-6 mb-5 sm:mb-6 lg:mb-7">
        <div className="absolute top-0 right-0 w-[120px] h-[120px] sm:w-[180px] sm:h-[180px] bg-[radial-gradient(circle_at_top_right,rgba(94,106,210,0.1),transparent_60%)] pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3 flex-wrap min-w-0">
            {live && <LiveBadge />}
            <span className="text-[12px] text-muted-foreground font-medium truncate">
              {format(created, "EEEE · d 'de' MMMM · 'Semana' w", { locale: es })}
            </span>
            {meeting.meetingType && (
              <span className="inline-flex items-center px-1.5 py-[1px] rounded text-[11px] font-medium bg-[#eeeffc] text-[#5e6ad2] shrink-0">
                {meeting.meetingType}
              </span>
            )}
          </div>

          <h1 className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-[-0.01em] mb-3 sm:mb-3.5 break-words">
            {meeting.title}
          </h1>

          {meeting.summary && (
            <p className="text-[12.5px] text-muted-foreground leading-[1.55] max-w-[640px] mb-4 break-words">
              {meeting.summary}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:gap-x-5 sm:gap-y-2.5 sm:p-3.5 bg-white border border-border rounded-lg mb-4 text-[12px] min-w-0">
            {start && (
              <MetaItem
                label="Hora"
                value={`${fmtTime(start)}${end ? ` → ${fmtTime(end)}` : ''}`}
              />
            )}

            {attendees.length > 0 && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] uppercase tracking-[0.03em] font-medium text-muted-foreground shrink-0">
                  Asistentes
                </span>
                <div className="flex -space-x-1.5 min-w-0">
                  {attendees.slice(0, 6).map((m) => (
                    <div
                      key={m.id}
                      className="ring-2 ring-white rounded-full shrink-0"
                      title={`${m.name}${m.email ? ` · ${m.email}` : ''}`}
                    >
                      <AssigneeAvatar member={m} size={22} />
                    </div>
                  ))}
                </div>
                {attendees.length > 6 && (
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    +{attendees.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <a
              href={meeting.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 min-h-[40px] sm:min-h-0 rounded-md text-[13px] font-medium border border-border bg-white hover:bg-[#f7f7f8] active:bg-[#eeeffc] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full sm:w-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir en Notion
            </a>
          </div>
        </div>
      </div>

      {blocks.length > 0 && (
        <section className="mb-6 sm:mb-7">
          <SectionHead title="Agenda" count={`${blocks.length} bloques`} />
          <div className="border border-border rounded-lg bg-white p-3 sm:p-4 overflow-hidden">
            <BlocksRenderer blocks={blocks} />
          </div>
        </section>
      )}

      {actionItems.length > 0 && (
        <section className="mb-6 sm:mb-7">
          {(() => {
            const open = actionItems.filter((t) => t.status !== 'Done').length;
            const done = actionItems.length - open;
            const label = `${open} abierta${open === 1 ? '' : 's'} · ${done} hecha${done === 1 ? '' : 's'}`;
            return (
              <SectionHead
                title="Tareas de esta reunión"
                count={label}
                countTone={open > 0 ? 'warn' : 'muted'}
              />
            );
          })()}
          <ActionItems tasks={actionItems} membersById={membersById} />
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

function SectionHead({
  title,
  count,
  countTone = 'muted',
}: {
  title: string;
  count?: string;
  countTone?: 'muted' | 'warn';
}) {
  return (
    <div className="flex items-baseline gap-2.5 mb-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {title}
      </h2>
      {count && (
        <span
          className={cn(
            'text-[12px] font-medium',
            countTone === 'warn' ? 'text-[#b8741d]' : 'text-muted-foreground',
          )}
        >
          {count}
        </span>
      )}
    </div>
  );
}
