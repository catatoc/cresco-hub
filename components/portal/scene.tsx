// Fondo de montaña al amanecer — la superficie crescō del portal.
export function PortalScene() {
  return (
    <div className="cp-scene" aria-hidden>
      <div className="cp-sun" />
      <svg className="cp-mtns" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMax slice">
        <path d="M0 380 L240 250 L470 350 L700 210 L960 360 L1180 270 L1440 360 L1440 600 L0 600 Z" fill="#C6CFBF" />
        <path d="M0 440 L260 320 L520 430 L780 300 L1040 440 L1260 350 L1440 430 L1440 600 L0 600 Z" fill="#9DAD94" />
        <path d="M0 510 L300 400 L560 500 L860 380 L1120 500 L1320 430 L1440 500 L1440 600 L0 600 Z" fill="#647A66" />
        <path d="M0 560 L320 480 L640 560 L920 470 L1200 560 L1440 510 L1440 600 L0 600 Z" fill="#3D5240" />
      </svg>
    </div>
  );
}
