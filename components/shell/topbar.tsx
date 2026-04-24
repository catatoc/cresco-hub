type Crumb = { label: string; href?: string; muted?: boolean };

type Props = { crumbs: Crumb[]; children?: React.ReactNode };

export function Topbar({ crumbs, children }: Props) {
  return (
    <div className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0">
      <nav className="flex items-center gap-2 text-[13px] min-w-0">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2 shrink-0">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            <span
              className={
                c.muted
                  ? 'text-muted-foreground font-normal truncate'
                  : 'text-foreground font-medium truncate'
              }
            >
              {c.label}
            </span>
          </span>
        ))}
      </nav>
      <div className="flex-1" />
      {children}
    </div>
  );
}
