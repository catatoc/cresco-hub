import type { TeamMember } from '@/schemas/team-member';
import { AssigneeAvatar } from './card';

type Props = {
  assignees: TeamMember[];
};

const MAX_AVATARS = 3;
const MAX_NAMES = 3;

/**
 * Card-bottom line: stack of avatars + comma-separated first names.
 * Returns null when there are no assignees so the card stays compact.
 */
export function AssigneeLine({ assignees }: Props) {
  if (assignees.length === 0) return null;

  const stackVisible = assignees.slice(0, MAX_AVATARS);
  const stackExtra = Math.max(0, assignees.length - MAX_AVATARS);

  const namesVisible = assignees
    .slice(0, MAX_NAMES)
    .map((m) => firstName(m.name))
    .join(', ');
  const namesExtra = Math.max(0, assignees.length - MAX_NAMES);
  const overflowNames = assignees
    .slice(MAX_NAMES)
    .map((m) => m.name)
    .join(', ');

  const namesText = namesExtra > 0 ? `${namesVisible} +${namesExtra}` : namesVisible;
  const fullTitle = assignees.map((m) => m.name).join(', ');

  return (
    <div
      className="mt-1.5 pt-1.5 border-t border-dashed border-border flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0"
      title={fullTitle}
    >
      <div className="flex items-center shrink-0">
        {stackVisible.map((m, i) => (
          <span
            key={m.id}
            className={i > 0 ? '-ml-1 ring-[1.5px] ring-white rounded-full' : ''}
          >
            <AssigneeAvatar member={m} size={18} />
          </span>
        ))}
        {stackExtra > 0 && (
          <span className="-ml-1 w-[18px] h-[18px] rounded-full bg-[#ececef] text-[9px] font-semibold text-muted-foreground grid place-items-center ring-[1.5px] ring-white">
            +{stackExtra}
          </span>
        )}
      </div>
      <span
        className="flex-1 min-w-0 truncate"
        title={namesExtra > 0 ? overflowNames : undefined}
      >
        {namesText}
      </span>
    </div>
  );
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}
