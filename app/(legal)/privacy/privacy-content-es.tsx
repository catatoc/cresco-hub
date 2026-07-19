import { LegalSection } from '../legal-section';

export function PrivacyContentEs() {
  return (
    <>
      <LegalSection title="1. Introducción">
        <p>
          crescō (&ldquo;nosotros&rdquo;, &ldquo;nuestro&rdquo;) es una herramienta de productividad que se conecta con
          Notion para ayudarte a gestionar proyectos, tareas y reuniones sin abrir Notion. Esta política
          explica qué información recolectamos, cómo la usamos y qué control tienes sobre ella.
        </p>
      </LegalSection>

      <LegalSection title="2. Información que recolectamos">
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
      </LegalSection>

      <LegalSection title="3. Cómo usamos tu información">
        <ul>
          <li>Autenticarte y mantener tu sesión activa.</li>
          <li>Sincronizar y mostrar tu contenido de Notion dentro de la aplicación.</li>
          <li>Mejorar la estabilidad y rendimiento del servicio.</li>
          <li>Comunicarte cambios importantes del producto cuando sea necesario.</li>
        </ul>
        <p>
          No vendemos tu información personal ni la usamos para publicidad de terceros.
        </p>
      </LegalSection>

      <LegalSection title="4. Inicio de sesión con Google">
        <p>
          Usamos Google OAuth para autenticarte. crescō solicita únicamente los permisos mínimos necesarios
          (perfil básico y correo). El uso de la información obtenida desde APIs de Google se adhiere a la{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="underline underline-offset-2 decoration-[#7E9A80] text-[#2A3B2D] hover:text-[#3D5240]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , incluyendo los requisitos de Limited Use.
        </p>
      </LegalSection>

      <LegalSection title="5. Almacenamiento y seguridad">
        <p>
          Usamos Supabase como proveedor de autenticación y base de datos. Las sesiones se gestionan mediante
          cookies seguras. No almacenamos tus tokens de acceso en el navegador y aplicamos las prácticas
          estándar de la industria para proteger tu información.
        </p>
      </LegalSection>

      <LegalSection title="6. Servicios de terceros">
        <p>
          Para que crescō funcione utilizamos: Google (autenticación), Notion (datos del workspace) y Supabase
          (autenticación y persistencia). Cada uno tiene sus propias políticas de privacidad.
        </p>
      </LegalSection>

      <LegalSection title="7. Tus derechos">
        <p>
          Puedes revocar el acceso de crescō a tu cuenta de Google en cualquier momento desde{' '}
          <a
            href="https://myaccount.google.com/permissions"
            className="underline underline-offset-2 decoration-[#7E9A80] text-[#2A3B2D] hover:text-[#3D5240]"
            target="_blank"
            rel="noopener noreferrer"
          >
            tus permisos de Google
          </a>
          . También puedes solicitar la eliminación de tu cuenta y datos asociados escribiéndonos.
        </p>
      </LegalSection>

      <LegalSection title="8. Cambios en esta política">
        <p>
          Podemos actualizar esta política cuando cambien funcionalidades del producto o requisitos legales.
          La fecha de &ldquo;Última actualización&rdquo; al inicio de la página refleja la última revisión.
        </p>
      </LegalSection>

      <LegalSection title="9. Contacto">
        <p>
          Para cualquier duda sobre esta política o el manejo de tus datos, escríbenos a{' '}
          <a
            href="mailto:hola@recordarte.com"
            className="underline underline-offset-2 decoration-[#7E9A80] text-[#2A3B2D] hover:text-[#3D5240]"
          >
            hola@recordarte.com
          </a>
          .
        </p>
      </LegalSection>
    </>
  );
}
