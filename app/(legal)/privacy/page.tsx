import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad · crescō',
  description: 'Cómo crescō recolecta, usa y protege tu información.',
};

const LAST_UPDATED = '29 de abril de 2026';

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral max-w-none">
      <h1 className="text-3xl font-semibold tracking-[-0.02em] text-neutral-900 mb-2">
        Política de Privacidad
      </h1>
      <p className="text-sm text-neutral-500 mb-10">Última actualización: {LAST_UPDATED}</p>

      <Section title="1. Introducción">
        <p>
          crescō (&ldquo;nosotros&rdquo;, &ldquo;nuestro&rdquo;) es una herramienta de productividad que se conecta con
          Notion para ayudarte a gestionar proyectos, tareas y reuniones sin abrir Notion. Esta política
          explica qué información recolectamos, cómo la usamos y qué control tienes sobre ella.
        </p>
      </Section>

      <Section title="2. Información que recolectamos">
        <ul>
          <li>
            <strong>Datos de cuenta de Google:</strong> al iniciar sesión con Google obtenemos tu nombre,
            correo electrónico e imagen de perfil.
          </li>
          <li>
            <strong>Contenido de Notion:</strong> con tu autorización, accedemos a las páginas y bases de
            datos de tu workspace de Notion necesarias para mostrar tareas, proyectos y reuniones.
          </li>
          <li>
            <strong>Datos de uso:</strong> registros técnicos básicos (errores, latencia, dispositivo) para
            mantener el servicio funcionando.
          </li>
        </ul>
      </Section>

      <Section title="3. Cómo usamos tu información">
        <ul>
          <li>Autenticarte y mantener tu sesión activa.</li>
          <li>Sincronizar y mostrar tu contenido de Notion dentro de la aplicación.</li>
          <li>Mejorar la estabilidad y rendimiento del servicio.</li>
          <li>Comunicarte cambios importantes del producto cuando sea necesario.</li>
        </ul>
        <p>
          No vendemos tu información personal ni la usamos para publicidad de terceros.
        </p>
      </Section>

      <Section title="4. Inicio de sesión con Google">
        <p>
          Usamos Google OAuth para autenticarte. crescō solicita únicamente los permisos mínimos necesarios
          (perfil básico y correo). El uso de la información obtenida desde APIs de Google se adhiere a la{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="underline underline-offset-2 hover:text-neutral-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , incluyendo los requisitos de Limited Use.
        </p>
      </Section>

      <Section title="5. Almacenamiento y seguridad">
        <p>
          Usamos Supabase como proveedor de autenticación y base de datos. Las sesiones se gestionan mediante
          cookies seguras. No almacenamos tus tokens de acceso en el navegador y aplicamos las prácticas
          estándar de la industria para proteger tu información.
        </p>
      </Section>

      <Section title="6. Servicios de terceros">
        <p>
          Para que crescō funcione utilizamos: Google (autenticación), Notion (datos del workspace) y Supabase
          (autenticación y persistencia). Cada uno tiene sus propias políticas de privacidad.
        </p>
      </Section>

      <Section title="7. Tus derechos">
        <p>
          Puedes revocar el acceso de crescō a tu cuenta de Google en cualquier momento desde{' '}
          <a
            href="https://myaccount.google.com/permissions"
            className="underline underline-offset-2 hover:text-neutral-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            tus permisos de Google
          </a>
          . También puedes solicitar la eliminación de tu cuenta y datos asociados escribiéndonos.
        </p>
      </Section>

      <Section title="8. Cambios en esta política">
        <p>
          Podemos actualizar esta política cuando cambien funcionalidades del producto o requisitos legales.
          La fecha de &ldquo;Última actualización&rdquo; al inicio de la página refleja la última revisión.
        </p>
      </Section>

      <Section title="9. Contacto">
        <p>
          Para cualquier duda sobre esta política o el manejo de tus datos, escríbenos a{' '}
          <a
            href="mailto:hola@recordarte.com"
            className="underline underline-offset-2 hover:text-neutral-900"
          >
            hola@recordarte.com
          </a>
          .
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold tracking-tight text-neutral-900 mb-3">{title}</h2>
      <div className="text-sm leading-relaxed text-neutral-700 space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_a]:text-neutral-900">
        {children}
      </div>
    </section>
  );
}
