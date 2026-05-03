import type { TestUser } from '@/schemas/test-user';
import { EmptyState } from '@/components/common/empty-state';
import { TestUserCard } from './test-user-card';

const NOTION_DB_URL =
  'https://www.notion.so/recordarte/29d0e14cc87443a7a7639460dfdd9f73';

type Props = {
  users: TestUser[];
  customerName: string;
};

export function TestUserGrid({ users, customerName }: Props) {
  if (users.length === 0) {
    return (
      <EmptyState
        icon="🔑"
        title="Sin usuarios de prueba"
        description={`Aún no hay credenciales para ${customerName}. Agrégalas desde Notion.`}
        action={
          <a
            href={NOTION_DB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-[#2563eb] hover:underline"
          >
            Abrir en Notion ↗
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
