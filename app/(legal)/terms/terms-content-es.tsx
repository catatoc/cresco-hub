import { LegalSection } from '../legal-section';

export function TermsContentEs() {
  return (
    <>
      <LegalSection title="1. Aceptación de los términos">
        <p>
          Al acceder y usar crescō (&ldquo;el Servicio&rdquo;) aceptas estos Términos de Servicio. Si no estás
          de acuerdo con alguno de los puntos, por favor no uses el Servicio.
        </p>
      </LegalSection>

      <LegalSection title="2. Descripción del Servicio">
        <p>
          crescō es una aplicación que se integra con Notion para mostrar y gestionar proyectos, tareas,
          reuniones y documentación desde una interfaz dedicada, sin necesidad de abrir Notion directamente.
        </p>
      </LegalSection>

      <LegalSection title="3. Cuenta de usuario">
        <ul>
          <li>Debes iniciar sesión usando una cuenta de Google válida.</li>
          <li>Eres responsable de mantener la confidencialidad de tu sesión.</li>
          <li>
            Te comprometes a usar el Servicio únicamente con cuentas y datos sobre los cuales tienes
            autorización.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Uso aceptable">
        <p>Al usar crescō te comprometes a no:</p>
        <ul>
          <li>Acceder a información o cuentas que no te pertenecen.</li>
          <li>Intentar comprometer la seguridad o integridad del Servicio.</li>
          <li>Realizar ingeniería inversa, decompilar o intentar extraer el código fuente.</li>
          <li>Usar el Servicio para actividades ilegales o que violen derechos de terceros.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Contenido de Notion">
        <p>
          Todo el contenido proveniente de tu workspace de Notion sigue siendo de tu propiedad. crescō
          únicamente actúa como intermediario para mostrarlo y editarlo bajo tu autorización. No reclamamos
          ningún derecho sobre tu contenido.
        </p>
      </LegalSection>

      <LegalSection title="6. Disponibilidad del Servicio">
        <p>
          Hacemos un esfuerzo razonable por mantener el Servicio disponible y estable, pero no garantizamos
          disponibilidad ininterrumpida. Podemos modificar, suspender o discontinuar funcionalidades en
          cualquier momento.
        </p>
      </LegalSection>

      <LegalSection title="7. Servicios de terceros">
        <p>
          crescō depende de Google, Notion y Supabase para funcionar. No somos responsables por interrupciones
          o cambios en esos servicios externos. El uso de esas plataformas se rige por sus respectivos
          términos.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitación de responsabilidad">
        <p>
          El Servicio se ofrece &ldquo;tal cual&rdquo;. En la máxima medida permitida por la ley, no nos
          hacemos responsables por daños indirectos, incidentales o consecuentes derivados del uso o
          imposibilidad de uso del Servicio.
        </p>
      </LegalSection>

      <LegalSection title="9. Cancelación">
        <p>
          Puedes dejar de usar el Servicio en cualquier momento revocando el acceso desde tu cuenta de Google.
          Nos reservamos el derecho de suspender cuentas que incumplan estos términos.
        </p>
      </LegalSection>

      <LegalSection title="10. Cambios en los términos">
        <p>
          Podemos actualizar estos términos cuando sea necesario. La fecha de &ldquo;Última actualización&rdquo;
          al inicio de la página refleja la versión vigente. El uso continuado del Servicio después de un
          cambio implica aceptación de los nuevos términos.
        </p>
      </LegalSection>

      <LegalSection title="11. Contacto">
        <p>
          Para preguntas sobre estos términos escríbenos a{' '}
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
