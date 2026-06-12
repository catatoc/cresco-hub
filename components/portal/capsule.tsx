'use client';

// La cápsula: un dock de vidrio con un chip por documento que EXISTE para
// este cliente (pagos · propuesta · accesos · infraestructura). El dato manda
// y la UI obedece: con un documento es un botón tranquilo, con cuatro es un
// dock, con cero no se renderiza. Un "lente" de luz sigue al hover.
import { useRef, useState } from 'react';
import { Brief, BriefSkeleton } from './brief';
import { getProposal } from '@/app/(portal)/actions';
import type { PortalPayments } from '@/lib/portal/payments';
import type { PortalDocuments, PortalTestUser } from '@/lib/portal/documents';
import type { ProjectBlock } from '@/lib/portal/content';

type DocKey = 'pagos' | 'propuesta' | 'accesos' | 'infra';

interface Chip {
  key: DocKey;
  label: string;
  state: string | null;
  alert: boolean; // punto vino pulsando (algo pendiente) vs musgo (al día)
}

const MODAL_TITLE: Record<DocKey, string> = {
  pagos: 'Pagos · con crescō',
  propuesta: 'Tu propuesta · con crescō',
  accesos: 'Usuarios de prueba · para que explores tu app',
  infra: 'Infraestructura · costos estimados',
};

// rol inferido del nombre de la cuenta — solo decide el color del badge
const ROLES = ['doctor', 'secretaria', 'admin', 'paciente'] as const;
type Rol = (typeof ROLES)[number] | 'cuenta';
function rolOf(u: PortalTestUser): Rol {
  const s = `${u.nombre} ${u.usuario}`.toLowerCase();
  return ROLES.find((r) => s.includes(r)) ?? (s.includes('patient') ? 'paciente' : 'cuenta');
}

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      className={`cp-kv-btn ${ok ? 'ok' : ''}`}
      onClick={() => {
        void navigator.clipboard?.writeText(value).catch(() => null);
        setOk(true);
        setTimeout(() => setOk(false), 1400);
      }}
    >
      {ok ? '✓ listo' : 'copiar'}
    </button>
  );
}

function CredCard({ u }: { u: PortalTestUser }) {
  const [show, setShow] = useState(false);
  const rol = rolOf(u);
  const env = u.host?.includes('dev') ? 'dev' : 'app';
  return (
    <div className="cp-cred">
      <div className="cp-cred-top">
        <span className={`cp-rol ${rol}`}><i />{rol}</span>
        <span className="cp-env">{env}</span>
      </div>
      <div className="cp-cred-name">{u.nombre}</div>
      <div className="cp-kv">
        <span className="cp-kv-k">usuario</span>
        <span className="cp-kv-v">{u.usuario}</span>
        <CopyBtn value={u.usuario} />
      </div>
      <div className="cp-kv">
        <span className="cp-kv-k">clave</span>
        <span className="cp-kv-v">{show ? u.clave : '•'.repeat(Math.min(u.clave.length, 12))}</span>
        <button className="cp-kv-btn" onClick={() => setShow((v) => !v)}>{show ? 'ocultar' : 'ver'}</button>
        <CopyBtn value={u.clave} />
      </div>
      {u.url && (
        <a className="cp-cred-url" href={u.url} target="_blank" rel="noreferrer">
          {u.host ?? u.url} ↗
        </a>
      )}
    </div>
  );
}

export function DocumentsCapsule({ payments, documents }: { payments: PortalPayments; documents: PortalDocuments }) {
  const [open, setOpen] = useState<DocKey | null>(null);
  const [closing, setClosing] = useState(false);
  // propuesta lazy: undefined = sin pedir · null = no hay · objeto = lista
  const [proposal, setProposal] = useState<{ title: string; blocks: ProjectBlock[] } | null | undefined>(undefined);
  const [stop, setStop] = useState(0); // escalón del simulador (0 = hoy)
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>({}); // acordeones
  const [infoOpen, setInfoOpen] = useState<Record<string, boolean>>({}); // ⓘ por servicio
  const capRef = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ left: number; width: number } | null>(null);

  const pendingN = payments.items.filter((p) => !p.paid).length;
  const chips: Chip[] = [];
  if (payments.items.length) {
    chips.push({
      key: 'pagos',
      label: 'pagos',
      state: pendingN ? `${payments.pendingLabel} pendiente` : 'al día',
      alert: pendingN > 0,
    });
  }
  if (documents.proposal) {
    chips.push({ key: 'propuesta', label: 'propuesta', state: documents.proposal.dateLabel, alert: false });
  }
  if (documents.testUsers.length) {
    const n = documents.testUsers.length;
    chips.push({ key: 'accesos', label: 'accesos', state: `${n} cuenta${n !== 1 ? 's' : ''}`, alert: false });
  }
  if (documents.infra) {
    chips.push({ key: 'infra', label: 'infraestructura', state: `${documents.infra.monthlyLabel}/mes`, alert: false });
  }
  if (!chips.length) return null;

  const close = () => {
    setClosing(true);
    setTimeout(() => { setOpen(null); setClosing(false); }, 280);
  };

  function openDoc(key: DocKey) {
    setOpen(key);
    if (key === 'infra') setStop(0); // el simulador siempre abre en "hoy"
    if (key === 'propuesta' && proposal === undefined) {
      void getProposal()
        .then((p) => setProposal(p))
        .catch(() => setProposal(null));
    }
  }

  function moveLens(e: React.MouseEvent<HTMLButtonElement>) {
    const cap = capRef.current;
    if (!cap) return;
    const b = e.currentTarget.getBoundingClientRect();
    const c = cap.getBoundingClientRect();
    setLens({ left: b.left - c.left, width: b.width });
  }

  const infra = documents.infra;
  const maxMonthly = infra ? Math.max(...infra.items.map((i) => i.monthly), 1) : 1;

  return (
    <>
      <div className="cp-capsule-wrap cp-rb" style={{ '--d': '.17s' } as React.CSSProperties}>
        <div className="cp-capsule" ref={capRef} onMouseLeave={() => setLens(null)}>
          {lens && <span className="cp-lens" style={{ left: lens.left, width: lens.width }} />}
          {chips.map((c) => (
            <button key={c.key} className="cp-chip" onClick={() => openDoc(c.key)} onMouseEnter={moveLens}>
              <span className={c.alert ? 'cp-chip-dot alert' : 'cp-chip-dot'} />
              {c.label}
              {c.state && <span className="cp-chip-st">{c.state}</span>}
            </button>
          ))}
        </div>
      </div>

      {open && (
        <>
          <div className={`cp-scrim ${closing ? 'closing' : ''}`} style={{ zIndex: 70 }} onClick={close} />
          <div className="cp-tm-wrap" onClick={close}>
            <div className={`cp-tm ${open !== 'pagos' ? 'cp-tmw' : ''} ${closing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="cp-tmh">
                <span className="cp-tmp">{MODAL_TITLE[open]}</span>
                <button className="cp-x" onClick={close}>×</button>
              </div>

              {open === 'pagos' && (
                <div className="cp-tmb">
                  <div className="cp-pay-hero">
                    {payments.pendingTotal > 0 ? (
                      <>
                        <span className="cp-pay-big">{payments.pendingLabel}</span>
                        <span className="cp-pay-sub">pendiente · {payments.items.length} pago{payments.items.length !== 1 ? 's' : ''}</span>
                      </>
                    ) : (
                      <span className="cp-pay-ok">Estás al día 🌱</span>
                    )}
                  </div>
                  {payments.items.map((p) => (
                    <div className="cp-pcard" key={p.id}>
                      <div className="cp-pcard-top">
                        <span className="cp-pcard-tt">{p.description}</span>
                        <span className={`cp-tpill ${p.paid ? 'done' : 'pend'}`}>{p.paid ? 'pagado' : 'pendiente'}</span>
                      </div>
                      {p.notes && <div className="cp-pcard-notes">{p.notes}</div>}
                      <div className="cp-pcard-foot">
                        <span className="cp-pcard-meta">{p.paid ? p.dateLabel ?? '' : p.dateLabel ? `vence ${p.dateLabel}` : 'fecha por definir'}</span>
                        <span className="cp-pcard-amt">{p.amountLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {open === 'propuesta' && (
                <div className="cp-tmb cp-brief" style={{ padding: '14px 2px 4px' }}>
                  {proposal === undefined ? (
                    <BriefSkeleton />
                  ) : proposal === null ? (
                    <div className="cp-empty">No encontramos la propuesta. Tu PM de crescō la publicará pronto.</div>
                  ) : (
                    <Brief blocks={proposal.blocks} />
                  )}
                </div>
              )}

              {open === 'accesos' && (
                <div className="cp-tmb">
                  <div className="cp-doc-note">
                    Cuentas del <b>entorno de prueba</b> para que explores tu aplicación — los datos son ficticios.
                  </div>
                  <div className="cp-cred-grid">
                    {documents.testUsers.map((u) => <CredCard key={u.id} u={u} />)}
                  </div>
                </div>
              )}

              {open === 'infra' && infra && (() => {
                const sim = infra.sim;
                if (!sim) {
                  // lista plana (Finance) — sin simulador
                  return (
                    <div className="cp-tmb">
                      <div className="cp-infra-hero">
                        <div>
                          <span className="cp-infra-big">{infra.monthlyLabel}<small> / mes</small></span>
                          <div className="cp-infra-sub">costo estimado de tu infraestructura</div>
                        </div>
                        <div className="cp-infra-yr"><b>{infra.yearlyLabel}</b>estimado anual</div>
                      </div>
                      {infra.items.map((s) => (
                        <div className="cp-svc" key={s.id}>
                          <div>
                            <div className="cp-svc-n">{s.name}</div>
                            {s.detail && <div className="cp-svc-d">{s.detail}</div>}
                          </div>
                          <div className="cp-svc-bar"><i style={{ width: `${Math.max(6, Math.round((s.monthly / maxMonthly) * 100))}%` }} /></div>
                          <div className="cp-svc-amt">{s.monthlyLabel}<small>/mes</small></div>
                        </div>
                      ))}
                      <div className="cp-doc-note" style={{ marginTop: 14 }}>
                        <b>Estimado, no factura.</b> Los servicios están a tu nombre; la cifra real puede variar con el uso.
                      </div>
                    </div>
                  );
                }
                // simulador: "¿y si llegamos a X usuarios?"
                const users = sim.stops[stop]!;
                const fmtUsers = users.toLocaleString('es-VE');
                const fmtMoney = (n: number) =>
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
                    maximumFractionDigits: 2,
                  }).format(n);
                // filas: servicios sueltos + grupos (acordeón) con su total sumado
                type SimItem = (typeof sim.items)[number];
                const GROUP_INFO: Record<string, string> = {
                  'Servidores · producción':
                    'Las computadoras donde vive tu aplicación — una por cada herramienta, para que ninguna afecte a las otras.',
                };
                const rows: { name: string; detail: string | null; info: string | null; byStop: number[]; children?: SimItem[] }[] = [];
                const byGroup = new Map<string, SimItem[]>();
                for (const s of sim.items) {
                  if (!s.group) { rows.push(s); continue; }
                  if (!byGroup.has(s.group)) byGroup.set(s.group, []);
                  byGroup.get(s.group)!.push(s);
                }
                for (const [g, children] of byGroup) {
                  rows.push({
                    name: g,
                    detail: `${children.length} servicios web en Render · según uso`,
                    info: GROUP_INFO[g] ?? null,
                    byStop: sim.stops.map((_, i) => children.reduce((sum, c) => sum + c.byStop[i]!, 0)),
                    children,
                  });
                }
                rows.sort((a, b) => b.byStop[0]! - a.byStop[0]!);
                const maxAtStop = Math.max(...rows.map((r) => r.byStop[stop]!), 1);
                const bar = (v: number) => `${Math.max(6, Math.round((v / maxAtStop) * 100))}%`;
                const infoBtn = (id: string, info: string | null) =>
                  info ? (
                    <span
                      className={`cp-svc-i ${infoOpen[id] ? 'on' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`qué es ${id}`}
                      onClick={(e) => { e.stopPropagation(); setInfoOpen((m) => ({ ...m, [id]: !m[id] })); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setInfoOpen((m) => ({ ...m, [id]: !m[id] })); } }}
                    >i</span>
                  ) : null;
                return (
                  <div className="cp-tmb">
                    <div className="cp-infra-hero">
                      <div>
                        <span className="cp-infra-big">{sim.totalLabelByStop[stop]}<small> / mes</small></span>
                        <div className="cp-infra-sub">
                          {stop === 0 ? <>hoy · ~{fmtUsers} usuarios activos</> : <>con ~<b>{fmtUsers}</b> usuarios activos</>}
                        </div>
                      </div>
                      <div className="cp-infra-yr"><b>{sim.yearlyLabelByStop[stop]}</b>estimado anual</div>
                    </div>
                    <div className="cp-sim">
                      <input
                        type="range"
                        className="cp-sim-range"
                        min={0}
                        max={sim.stops.length - 1}
                        step={1}
                        value={stop}
                        onChange={(e) => setStop(Number(e.target.value))}
                        aria-label="usuarios activos"
                      />
                      <div className="cp-sim-stops">
                        {sim.stops.map((u, i) => (
                          <button key={u} className={`cp-sim-stop ${i === stop ? 'on' : ''}`} onClick={() => setStop(i)}>
                            {i === 0 ? 'hoy' : u >= 1000 ? `${u / 1000}k` : u}
                          </button>
                        ))}
                      </div>
                    </div>
                    {rows.map((r) => {
                      if (!r.children) {
                        return (
                          <div className="cp-svc-wrap" key={r.name}>
                            <div className="cp-svc">
                              <div>
                                <div className="cp-svc-n">{r.name}{infoBtn(r.name, r.info)}</div>
                                {r.detail && <div className="cp-svc-d">{r.detail}</div>}
                              </div>
                              <div className="cp-svc-bar"><i style={{ width: bar(r.byStop[stop]!) }} /></div>
                              <div className="cp-svc-amt">{fmtMoney(r.byStop[stop]!)}<small>/mes</small></div>
                            </div>
                            {infoOpen[r.name] && r.info && <div className="cp-svc-info">{r.info}</div>}
                          </div>
                        );
                      }
                      const isOpen = !!groupsOpen[r.name];
                      return (
                        <div className="cp-svc-wrap" key={r.name}>
                          <button
                            className="cp-svc cp-svc-group"
                            onClick={() => setGroupsOpen((m) => ({ ...m, [r.name]: !isOpen }))}
                            aria-expanded={isOpen}
                          >
                            <div>
                              <div className="cp-svc-n"><span className={`cp-chev ${isOpen ? 'open' : ''}`}>▸</span>{r.name}{infoBtn(r.name, r.info)}</div>
                              {r.detail && <div className="cp-svc-d">{r.detail}</div>}
                            </div>
                            <div className="cp-svc-bar"><i style={{ width: bar(r.byStop[stop]!) }} /></div>
                            <div className="cp-svc-amt">{fmtMoney(r.byStop[stop]!)}<small>/mes</small></div>
                          </button>
                          {infoOpen[r.name] && r.info && <div className="cp-svc-info">{r.info}</div>}
                          {isOpen && r.children.map((c) => (
                            <div key={c.name}>
                              <div className="cp-svc cp-svc-sub">
                                <div>
                                  <div className="cp-svc-n">{c.name}{infoBtn(c.name, c.info)}</div>
                                  {c.detail && <div className="cp-svc-d">{c.detail}</div>}
                                </div>
                                <div className="cp-svc-bar"><i style={{ width: bar(c.byStop[stop]!) }} /></div>
                                <div className="cp-svc-amt">{c.labelByStop[stop]}<small>/mes</small></div>
                              </div>
                              {infoOpen[c.name] && c.info && <div className="cp-svc-info sub">{c.info}</div>}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    <div className="cp-doc-note" style={{ marginTop: 14 }}>
                      <b>Estimado, no factura.</b> Los montos son aproximados y dependerán del uso real;
                      la proyección sigue los planes de cada proveedor (Render, Supabase, DigitalOcean,
                      Postmark) — mover el control no contrata nada.
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </>
  );
}
