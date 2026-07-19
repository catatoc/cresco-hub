import { useTranslations } from 'next-intl';
import type { TestUser } from '@/schemas/test-user';
import { EmptyState } from '@/components/common/empty-state';
import { TestUserCard } from './test-user-card';

const NOTION_DB_URL =
  'https://www.notion.so/recordarte/29d0e14cc87443a7a7639460dfdd9f73';

type Props = {
  users: TestUser[];
  memberName: string;
  customerName: string;
};

export function TestUserGrid({ users, memberName, customerName }: Props) {
  const t = useTranslations('testUsers.empty');

  if (users.length === 0) {
    return (
      <EmptyState
        icon="🔑"
        title={t('title')}
        description={t('description', { memberName, customerName })}
        action={
          <a
            href={NOTION_DB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-[#2563eb] hover:underline"
          >
            {t('openInNotion')}
          </a>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {users.map((user) => (
        <TestUserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
