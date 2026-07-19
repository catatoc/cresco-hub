import { LegalSection } from '../legal-section';

export function PrivacyContentEn() {
  return (
    <>
      <LegalSection title="1. Introduction">
        <p>
          crescō (&ldquo;we&rdquo;, &ldquo;our&rdquo;) is a productivity tool that connects with Notion to
          help you manage projects, tasks, and meetings without opening Notion. This policy explains what
          information we collect, how we use it, and what control you have over it.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <ul>
          <li>
            <strong>Google account data:</strong> when you sign in with Google we obtain your name, email
            address, and profile picture.
          </li>
          <li>
            <strong>Notion content:</strong> with your authorization, we access the pages and databases in
            your Notion workspace needed to display tasks, projects, and meetings.
          </li>
          <li>
            <strong>Usage data:</strong> basic technical logs (errors, latency, device) to keep the service
            running.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use your information">
        <ul>
          <li>Authenticate you and keep your session active.</li>
          <li>Sync and display your Notion content within the application.</li>
          <li>Improve the stability and performance of the service.</li>
          <li>Notify you of important product changes when necessary.</li>
        </ul>
        <p>
          We do not sell your personal information or use it for third-party advertising.
        </p>
      </LegalSection>

      <LegalSection title="4. Sign in with Google">
        <p>
          We use Google OAuth to authenticate you. crescō requests only the minimum permissions required
          (basic profile and email). Our use of information obtained from Google APIs adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="underline underline-offset-2 decoration-[#7E9A80] text-[#2A3B2D] hover:text-[#3D5240]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </LegalSection>

      <LegalSection title="5. Storage and security">
        <p>
          We use Supabase as our authentication and database provider. Sessions are managed through secure
          cookies. We do not store your access tokens in the browser, and we apply industry-standard
          practices to protect your information.
        </p>
      </LegalSection>

      <LegalSection title="6. Third-party services">
        <p>
          For crescō to work, we use: Google (authentication), Notion (workspace data), and Supabase
          (authentication and persistence). Each has its own privacy policy.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          You can revoke crescō&rsquo;s access to your Google account at any time from{' '}
          <a
            href="https://myaccount.google.com/permissions"
            className="underline underline-offset-2 decoration-[#7E9A80] text-[#2A3B2D] hover:text-[#3D5240]"
            target="_blank"
            rel="noopener noreferrer"
          >
            your Google permissions
          </a>
          . You can also request the deletion of your account and associated data by writing to us.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to this policy">
        <p>
          We may update this policy when product features or legal requirements change. The &ldquo;Last
          updated&rdquo; date at the top of the page reflects the most recent revision.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          For any questions about this policy or how we handle your data, write to us at{' '}
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
