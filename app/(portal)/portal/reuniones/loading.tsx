import { PortalScene } from '@/components/portal/scene';
import { Brand } from '@/components/portal/brand';

// Esqueleto instantáneo del índice de reuniones (misma silueta que la lista).
export default function Loading() {
  return (
    <main className="cp-page">
      <PortalScene />
      <div className="cp-stage" style={{ maxWidth: 760 }}>
        <div className="cp-topbar">
          <span className="cp-sk" style={{ width: 140, height: 13 }} />
          <Brand size={19} />
        </div>
        <div className="cp-greet">
          <span className="cp-sk" style={{ display: 'block', width: 200, height: 26 }} />
          <span className="cp-sk" style={{ display: 'block', width: 300, height: 12, marginTop: 10 }} />
        </div>
        <div className="cp-glass">
          {[78, 64, 70, 58].map((w, i) => (
            <div className="cp-meet" key={i}>
              <div className="cp-mh">
                <span className="cp-sk" style={{ width: `${w}%`, height: 13 }} />
                <span className="cp-sk" style={{ width: 38, height: 10 }} />
              </div>
              <span className="cp-sk" style={{ display: 'block', width: '88%', height: 10, marginTop: 9 }} />
              <span className="cp-sk" style={{ display: 'block', width: '52%', height: 10, marginTop: 6 }} />
              <div style={{ display: 'flex', marginTop: 9 }}>
                {[0, 1, 2].map((j) => (
                  <span key={j} className="cp-sk" style={{ width: 18, height: 18, borderRadius: '50%', marginLeft: j ? -5 : 0 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
