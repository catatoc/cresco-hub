'use client';

import { useEffect, useRef, useState } from 'react';

// El lockup de marca del portal, según el manual (cresco-design · identidad 06):
//  - wordmark 100% tipográfico: Inter 500, "crescō" + punto "." en moss sobre la
//    baseline, que pulsa cuando la pantalla está viva (header de app)
//  - co-branding "crescō × cliente": × en gris a ~2/3 del tamaño, acompañante
//    al mismo tamaño óptico que el wordmark
//
// El logo del cliente es una imagen, así que el "mismo tamaño" se calibra por
// tipografía, no por la caja: los SVGs de logos/clientes se exportan con el
// bounding box pegado al contenido y la baseline del texto en el borde
// inferior; con Inter (x-height = 51% del em) un logo con x-height ≈ 53% de su
// alto calza pixel-perfect a height: .96em alineado por baseline.
//
// Para que crescō y el cliente aparezcan JUNTOS (sin pop del <img> al cargar),
// el lockup completo se revela solo cuando la imagen ya está decodificada.
export function Brand({ logo, name, size }: { logo?: string | null; name?: string; size?: number }) {
  const [ready, setReady] = useState(!logo);
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  // imagen cacheada: onLoad puede haber disparado antes de hidratar
  useEffect(() => {
    if (img.current?.complete) setReady(true);
  }, []);

  return (
    <span className={`cp-brand${ready ? ' in' : ''}`} style={size ? { fontSize: size } : undefined}>
      <span className="cp-word">crescō<span className="cp-dot">.</span></span>
      {logo && !failed && (
        <>
          <span className="cp-clogo-sep" aria-hidden>×</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={img}
            className="cp-clogo"
            src={logo}
            alt={name ?? ''}
            onLoad={() => setReady(true)}
            onError={() => { setFailed(true); setReady(true); }}
          />
        </>
      )}
    </span>
  );
}
