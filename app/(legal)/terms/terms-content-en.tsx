import { LegalSection } from '../legal-section';

export function TermsContentEn() {
  return (
    <>
      <LegalSection title="1. Acceptance of terms">
        <p>
          By accessing and using crescō (&ldquo;the Service&rdquo;) you accept these Terms of Service. If you
          do not agree with any of the points, please do not use the Service.
        </p>
      </LegalSection>

      <LegalSection title="2. Description of the Service">
        <p>
          crescō is an application that integrates with Notion to display and manage projects, tasks,
          meetings, and documentation from a dedicated interface, without needing to open Notion directly.
        </p>
      </LegalSection>

      <LegalSection title="3. User account">
        <ul>
          <li>You must sign in using a valid Google account.</li>
          <li>You are responsible for keeping your session confidential.</li>
          <li>
            You agree to use the Service only with accounts and data that you are authorized to access.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>When using crescō you agree not to:</p>
        <ul>
          <li>Access information or accounts that do not belong to you.</li>
          <li>Attempt to compromise the security or integrity of the Service.</li>
          <li>Reverse engineer, decompile, or attempt to extract the source code.</li>
          <li>Use the Service for illegal activities or activities that violate third-party rights.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Notion content">
        <p>
          All content coming from your Notion workspace remains your property. crescō acts solely as an
          intermediary to display and edit it under your authorization. We do not claim any rights over your
          content.
        </p>
      </LegalSection>

      <LegalSection title="6. Service availability">
        <p>
          We make a reasonable effort to keep the Service available and stable, but we do not guarantee
          uninterrupted availability. We may modify, suspend, or discontinue features at any time.
        </p>
      </LegalSection>

      <LegalSection title="7. Third-party services">
        <p>
          crescō relies on Google, Notion, and Supabase to function. We are not responsible for interruptions
          or changes in those external services. Use of those platforms is governed by their respective
          terms.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitation of liability">
        <p>
          The Service is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, we are not
          liable for indirect, incidental, or consequential damages arising from the use of or inability to
          use the Service.
        </p>
      </LegalSection>

      <LegalSection title="9. Termination">
        <p>
          You can stop using the Service at any time by revoking access from your Google account. We reserve
          the right to suspend accounts that violate these terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes to the terms">
        <p>
          We may update these terms when necessary. The &ldquo;Last updated&rdquo; date at the top of the
          page reflects the current version. Continued use of the Service after a change implies acceptance
          of the new terms.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          For questions about these terms, write to us at{' '}
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
