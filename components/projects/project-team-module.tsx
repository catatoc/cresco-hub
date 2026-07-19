import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TeamMember } from '@/schemas/team-member';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}

const AVATAR_BG = ['#cbd5ff', '#f4a3a3', '#a3d8b1', '#e3c69b', '#c8b3e8', '#a3d4e8'];
function bgFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length]!;
}

type Props = { members: TeamMember[]; ownerName: string | null };

export function ProjectTeamModule({ members, ownerName }: Props) {
  const t = useTranslations('projects.team');
  if (members.length === 0 && !ownerName) {
    return (
      <Module title={t('title')}>
        <p className="text-[12px] text-muted-foreground py-3">{t('empty')}</p>
      </Module>
    );
  }

  const visible = members.slice(0, 5);
  const overflow = members.length - visible.length;

  return (
    <Module title={t('title')}>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1.5 bg-[#fafbff] border border-[#f0f0f4] rounded-full pl-1 pr-2.5 py-0.5 text-[11.5px]"
          >
            <span
              aria-hidden
              className="w-5 h-5 rounded-full grid place-items-center text-[9.5px] font-semibold text-white"
              style={{ background: bgFor(m.id) }}
            >
              {initials(m.name)}
            </span>
            {m.name}
          </span>
        ))}
        {overflow > 0 && (
          <span className="inline-flex items-center bg-[#fafbff] border border-[#f0f0f4] rounded-full px-2.5 py-1 text-[11.5px] text-muted-foreground">
            +{overflow}
          </span>
        )}
      </div>
      {ownerName && (
        <p className="text-[10.5px] text-muted-foreground mt-2">
          {t('owner', { name: ownerName })}
        </p>
      )}
    </Module>
  );
}

function Module({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-border rounded-xl px-4 py-3.5">
      <h2 className="text-[12px] font-semibold flex items-center gap-2 mb-2">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        {title}
      </h2>
      {children}
    </section>
  );
}
