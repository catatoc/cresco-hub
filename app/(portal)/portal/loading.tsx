import { PortalScene } from '@/components/portal/scene';
import { Brand } from '@/components/portal/brand';

// Esqueleto instantáneo del portal (mismo layout que el real, con shimmer).
export default function Loading() {
  return (
    <main className="cp-page">
      <PortalScene />
      <div className="cp-stage">
        <div className="cp-topbar">
          <Brand />
          <span className="cp-sk" style={{ width: 170, height: 40, borderRadius: 99 }} />
        </div>
        <div className="cp-greet">
          <span className="cp-sk" style={{ display: 'block', width: 200, height: 26 }} />
          <span className="cp-sk" style={{ display: 'block', width: 300, height: 12, marginTop: 10 }} />
        </div>
        <div className="cp-glass">
          <div className="cp-ghead">
            <span className="cp-sk" style={{ width: 130, height: 12 }} />
            <span className="cp-sk" style={{ width: 70, height: 10 }} />
          </div>
          {[64, 48].map((w, i) => (
            <div className="cp-row" key={i} style={{ cursor: 'default' }}>
              <span className="cp-sk" style={{ width: 14, height: 8 }} />
              <div className="cp-rowhead">
                <div className="cp-info">
                  <span className="cp-sk" style={{ display: 'block', width: `${w}%`, height: 14 }} />
                  <span className="cp-sk" style={{ display: 'block', width: '42%', height: 9, marginTop: 7 }} />
                </div>
                <span className="cp-health"><span className="cp-sk" style={{ width: 64, height: 10 }} /></span>
              </div>
              <div className="cp-tlw">
                <span className="cp-sk" style={{ width: '100%', maxWidth: 300, height: 3, borderRadius: 99 }} />
              </div>
              <span className="cp-sk cp-pill" style={{ width: 56, height: 18, border: 'none' }} />
            </div>
          ))}
        </div>
        <div className="cp-lower">
          {[0, 1].map((i) => (
            <div className="cp-glass" key={i}>
              <div className="cp-ghead"><span className="cp-sk" style={{ width: 150, height: 12 }} /></div>
              <div style={{ padding: '16px 22px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span className="cp-sk" style={{ width: '85%', height: 11 }} />
                <span className="cp-sk" style={{ width: '70%', height: 11 }} />
                <span className="cp-sk" style={{ width: '78%', height: 11 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
