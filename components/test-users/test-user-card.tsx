import type { TestUser } from '@/schemas/test-user';
import { CredentialField } from './credential-field';

type Props = { user: TestUser };

export function TestUserCard({ user }: Props) {
  return (
    <article className="bg-white border border-border rounded-[10px] p-4 space-y-3">
      <header>
        <h3 className="text-[14px] font-semibold text-foreground leading-tight">
          {user.nombre}
        </h3>
        {user.usuario && (
          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
            {user.usuario}
          </p>
        )}
      </header>
      <div className="space-y-2">
        {user.usuario && (
          <CredentialField field="user" value={user.usuario} type="text" />
        )}
        <CredentialField field="password" value={user.clave} type="password" />
        {user.url && <CredentialField field="url" value={user.url} type="url" />}
      </div>
    </article>
  );
}
