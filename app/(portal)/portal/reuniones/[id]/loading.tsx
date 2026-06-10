import { PortalScene } from '@/components/portal/scene';
import { Brand } from '@/components/portal/brand';

// Esqueleto instantáneo de la página editorial de una reunión:
// misma silueta que el acta real (pill, título, asistentes, lede, bullets).
export default function Loading() {
  return (
    <main className="cp-page">
      <PortalScene />
      <div className="cp-stage cp-mp-stage">
        <div className="cp-topbar">
          <span className="cp-sk" style={{ width: 140, height: 13 }} />
          <Brand size={19} />
        </div>
        <article className="cp-mp">
          <span className="cp-sk" style={{ width: 230, height: 22, borderRadius: 99 }} />
          <span className="cp-sk" style={{ display: 'block', width: '64%', height: 28, marginTop: 18 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <span style={{ display: 'flex' }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="cp-sk"
                  style={{ width: 24, height: 24, borderRadius: '50%', marginLeft: i ? -7 : 0 }}
                />
              ))}
            </span>
            <span className="cp-sk" style={{ width: 180, height: 11 }} />
          </div>
          <span className="cp-sk" style={{ width: 140, height: 9, display: 'block', marginTop: 30 }} />
          <div style={{ borderLeft: '2px solid var(--cp-moss-lt)', paddingLeft: 14, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <span className="cp-sk" style={{ width: '94%', height: 12 }} />
            <span className="cp-sk" style={{ width: '78%', height: 12 }} />
          </div>
          <span className="cp-sk" style={{ width: 110, height: 9, display: 'block', marginTop: 28 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 13 }}>
            {['90%', '82%', '87%', '70%'].map((w, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="cp-sk" style={{ width: 4.5, height: 4.5, borderRadius: '50%' }} />
                <span className="cp-sk" style={{ width: w, height: 11 }} />
              </span>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
