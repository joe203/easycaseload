import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy - EasyCaseload",
  description:
    "Privacy Policy for EasyCaseload.com, operated by fivesixteen.ai.",
}

export default function PrivacyPage() {
  return (
    <div className="bg-background py-16 md:py-24">
      <article className="prose prose-slate mx-auto w-[90%] max-w-4xl dark:prose-invert">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective Date: [Insert Date]
          <br />
          Website: EasyCaseload.com
          <br />
          Operated by: fivesixteen.ai
        </p>

        <hr className="my-8 border-border/60" />

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            1. Overview
          </h2>
          <p className="leading-relaxed text-foreground/80">
            {
              'EasyCaseload.com ("Service") is operated by fivesixteen.ai.'
            }
          </p>
          <p className="leading-relaxed text-foreground/80">
            We are committed to protecting your privacy and handling your
            information responsibly.
          </p>
          <p className="leading-relaxed text-foreground/80">
            This Privacy Policy explains:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>What we collect</li>
            <li>How we use it</li>
            <li>How we protect it</li>
            <li>Your rights</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            2. Information We Collect
          </h2>

          <h3 className="text-lg font-medium text-foreground">
            A. Information You Provide
          </h3>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>Name</li>
            <li>Email address</li>
            <li>Professional role</li>
            <li>Survey responses</li>
            <li>Caseload or workflow data you enter</li>
          </ul>
          <p className="leading-relaxed text-foreground/80">
            If you choose to enter student-related information, you are
            responsible for ensuring you have proper authorization.
          </p>

          <h3 className="text-lg font-medium text-foreground">
            B. Automatically Collected Information
          </h3>
          <p className="leading-relaxed text-foreground/80">We may collect:</p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>IP address</li>
            <li>Browser type</li>
            <li>Device information</li>
            <li>Usage analytics</li>
          </ul>
          <p className="leading-relaxed text-foreground/80">
            This helps improve performance and usability.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            3. How We Use Information
          </h2>
          <p className="leading-relaxed text-foreground/80">
            We use collected information to:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>Provide and improve the Service</li>
            <li>Process survey feedback</li>
            <li>Respond to inquiries</li>
            <li>Enhance workflow automation</li>
            <li>Improve product features</li>
          </ul>
          <p className="font-medium leading-relaxed text-foreground/80">
            We do not sell your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            4. Data Storage and Security
          </h2>
          <p className="leading-relaxed text-foreground/80">
            We implement reasonable technical and administrative safeguards to
            protect your information.
          </p>
          <p className="leading-relaxed text-foreground/80">
            However, no system is 100% secure. Users should avoid uploading
            highly sensitive information unless authorized.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            5. FERPA and Educational Data
          </h2>
          <p className="leading-relaxed text-foreground/80">
            EasyCaseload is not a school or district. If you upload student
            information:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>
              You are responsible for compliance with FERPA or applicable laws.
            </li>
            <li>
              We process information solely to provide services to you.
            </li>
            <li>We do not use student data for advertising.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            6. Data Sharing
          </h2>
          <p className="leading-relaxed text-foreground/80">
            We do not sell personal data. We may share information:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>
              With trusted service providers (e.g., hosting infrastructure)
            </li>
            <li>When legally required</li>
            <li>To protect rights and security</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            7. Cookies and Tracking
          </h2>
          <p className="leading-relaxed text-foreground/80">
            We may use cookies or similar technologies to:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>Maintain session state</li>
            <li>Improve user experience</li>
            <li>Analyze usage trends</li>
          </ul>
          <p className="leading-relaxed text-foreground/80">
            You may disable cookies in your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            8. Data Retention
          </h2>
          <p className="leading-relaxed text-foreground/80">
            We retain information only as long as necessary to:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>Provide services</li>
            <li>Comply with legal obligations</li>
            <li>Improve system performance</li>
          </ul>
          <p className="leading-relaxed text-foreground/80">
            You may request deletion of your data (see Section 10).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            {"9. Children's Privacy"}
          </h2>
          <p className="leading-relaxed text-foreground/80">
            EasyCaseload is intended for educators and professionals, not
            children under 13. We do not knowingly collect personal information
            from children.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            10. Your Rights
          </h2>
          <p className="leading-relaxed text-foreground/80">
            You may request to:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>Access your data</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data</li>
            <li>Withdraw consent (where applicable)</li>
          </ul>
          <p className="leading-relaxed text-foreground/80">
            Contact: [Insert Contact Email]
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            11. Changes to This Policy
          </h2>
          <p className="leading-relaxed text-foreground/80">
            We may update this Privacy Policy. Updates will be posted on this
            page with a revised effective date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            12. Contact
          </h2>
          <p className="leading-relaxed text-foreground/80">
            For privacy questions:
          </p>
          <p className="leading-relaxed text-foreground/80">
            Email: [Insert Contact Email]
            <br />
            Operated by: fivesixteen.ai
          </p>
        </section>
      </article>
    </div>
  )
}
