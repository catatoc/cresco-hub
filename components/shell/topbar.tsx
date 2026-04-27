type Crumb = { label: string; href?: string; muted?: boolean };

type Props = { crumbs: Crumb[]; children?: React.ReactNode };

export function Topbar({ crumbs, children }: Props) {
  return (
    <div className="h-11 border-b border-border flex items-center pl-12 pr-3 sm:pr-4 lg:pl-4 gap-2 sm:gap-3 shrink-0">
      <nav className="flex items-center gap-2 text-[13px] min-w-0 flex-1">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span
              key={i}
              className={
                isLast ? 'flex items-center gap-2 min-w-0' : 'flex items-center gap-2 shrink-0'
              }
            >
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
          );
        })}
      </nav>
      {children && <div className="flex items-center gap-2 shrink min-w-0">{children}</div>}
    </div>
  );
}
