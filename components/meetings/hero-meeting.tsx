import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';
import type { Meeting } from '@/schemas/meeting';
import type { Task } from '@/schemas/task';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { LiveBadge, isLive } from './live-badge';
import { ActionItems } from './action-items';

type Props = {
  meeting: Meeting;
  blocks: any[];
  actionItems: Task[];
};

export function HeroMeeting({ meeting, blocks, actionItems }: Props) {
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
          </div>

          <h1 className="text-[22px] font-semibold tracking-[-0.01em] mb-3.5">{meeting.title}</h1>

          <div className="flex flex-wrap gap-4 p-3.5 bg-white border border-border rounded-lg mb-4 text-[12px]">
            {start && (
              <MetaItem
                label="Hora"
                value={`${fmtTime(start)}${end ? ` → ${fmtTime(end)}` : ''}`}
              />
            )}
            {meeting.meetingType && <MetaItem label="Tipo" value={meeting.meetingType} />}
          </div>

          <div className="flex gap-2">
            {/* TODO(refactor-C): restore join button when Meet URL field is added to Notion schema */}
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
          <ActionItems tasks={actionItems} />
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
