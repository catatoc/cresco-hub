import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PortalScene } from '@/components/portal/scene';
// la receta de vidrio + la escena viven en el CSS del portal; esta pantalla es
// la misma superficie, así que la importa en vez de duplicarla
import '../../(portal)/portal.css';

// WhatsApp del estudio, con el saludo ya escrito para que el cliente solo envíe
const WHATSAPP = 'https://wa.me/584141181358';

// Destino de requireContext() cuando el correo no tiene portal activo: o el
// cliente ya no está en un proyecto vivo, o nunca lo estuvo. Es una pantalla de
// marca — la montaña y un gracias — no un muro de error.
export default function NoAccessPage() {
  const t = useTranslations('auth.noAccess');
  const wa = `${WHATSAPP}?text=${encodeURIComponent(t('whatsappGreeting'))}`;

  return (
    <main className="cp-page">
      <PortalScene />

      <div className="cp-err">
        <div className="cp-err-card cp-na-card">
          <span className="cp-brand in">
            <span className="cp-word">
              crescō<span className="cp-dot">.</span>
            </span>
          </span>

          <h1>{t('title')}</h1>
          <p>{t('description')}</p>

          <div className="cp-na-acts">
            <a className="cp-na-wa" href={wa} target="_blank" rel="noopener noreferrer">
              {t('contactTeam')}
              <i aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.25-.85.84-.85 2.03 0 1.2.87 2.35.99 2.51.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
                </svg>
              </i>
            </a>
            <Link className="cp-na-back" href="/login">
              {t('backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
