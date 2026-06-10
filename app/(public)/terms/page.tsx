import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Use - EasyCaseload",
  description:
    "Terms of Use for EasyCaseload.com, operated by fivesixteen.ai.",
}

export default function TermsPage() {
  return (
    <div className="bg-background py-16 md:py-24">
      <article className="prose prose-slate mx-auto w-[90%] max-w-4xl dark:prose-invert">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Terms of Use
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
            1. Acceptance of Terms
          </h2>
          <p className="leading-relaxed text-foreground/80">
            {
              'By accessing or using EasyCaseload.com ("Service"), you agree to be bound by these Terms of Use. If you do not agree, do not use the Service.'
            }
          </p>
          <p className="leading-relaxed text-foreground/80">
            {
              'EasyCaseload is owned and operated by fivesixteen.ai ("Company," "we," "us," or "our").'
            }
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            2. Description of Service
          </h2>
          <p className="leading-relaxed text-foreground/80">
            EasyCaseload provides workflow, documentation, and administrative
            support tools designed to assist itinerant educators and school
            service providers in managing caseloads, paperwork, and related
            responsibilities.
          </p>
          <p className="leading-relaxed text-foreground/80">
            The Service may include:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>Surveys and feedback tools</li>
            <li>Administrative workflow automation</li>
            <li>Data processing and reporting</li>
            <li>Beta features under development</li>
          </ul>
          <p className="leading-relaxed text-foreground/80">
            We reserve the right to modify or discontinue features at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            3. Beta Services Disclaimer
          </h2>
          <p className="leading-relaxed text-foreground/80">
            Some features may be offered as part of a beta program. Beta
            features:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>May change without notice</li>
            <li>May contain bugs or errors</li>
            <li>
              {'Are provided "as is" without warranties'}
            </li>
          </ul>
          <p className="leading-relaxed text-foreground/80">
            By using beta features, you acknowledge these limitations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            4. User Responsibilities
          </h2>
          <p className="leading-relaxed text-foreground/80">You agree:</p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>To provide accurate information</li>
            <li>Not to upload unlawful, harmful, or malicious content</li>
            <li>
              Not to attempt to access data belonging to other users
            </li>
            <li>
              To use the Service only for lawful educational and administrative
              purposes
            </li>
          </ul>
          <p className="leading-relaxed text-foreground/80">
            If you upload student-related information, you represent that you are
            authorized to do so under applicable laws and school policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            5. Data and Educational Records
          </h2>
          <p className="leading-relaxed text-foreground/80">
            EasyCaseload is designed to assist educators. However:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>
              You remain responsible for compliance with FERPA or other
              applicable education privacy laws.
            </li>
            <li>
              You must not upload sensitive student information unless authorized
              by your school or district.
            </li>
            <li>We process data solely to provide the Service.</li>
            <li>We do not claim ownership of your uploaded content.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            6. Intellectual Property
          </h2>
          <p className="leading-relaxed text-foreground/80">
            All content, branding, design, and software associated with
            EasyCaseload is the property of fivesixteen.ai unless otherwise
            stated.
          </p>
          <p className="leading-relaxed text-foreground/80">You may not:</p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>Copy, reproduce, or distribute the software</li>
            <li>Reverse engineer the system</li>
            <li>Use the brand or logo without permission</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            7. Payment and Subscription (If Applicable)
          </h2>
          <p className="leading-relaxed text-foreground/80">
            If paid plans are introduced:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>Fees will be clearly disclosed.</li>
            <li>Subscriptions may auto-renew unless canceled.</li>
            <li>
              Refund policies will be specified at the time of purchase.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            8. Disclaimer of Warranties
          </h2>
          <p className="leading-relaxed text-foreground/80">
            {'The Service is provided "as is" and "as available."'}
          </p>
          <p className="leading-relaxed text-foreground/80">
            We make no warranties regarding:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>Accuracy of generated outputs</li>
            <li>Continuous availability</li>
            <li>Error-free operation</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            9. Limitation of Liability
          </h2>
          <p className="leading-relaxed text-foreground/80">
            To the maximum extent permitted by law:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>
              fivesixteen.ai shall not be liable for indirect, incidental,
              special, or consequential damages arising from use of the Service.
            </li>
            <li>
              Total liability shall not exceed the amount paid (if any) in the
              previous 12 months.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            10. Termination
          </h2>
          <p className="leading-relaxed text-foreground/80">
            We may suspend or terminate access if:
          </p>
          <ul className="list-disc space-y-1 pl-6 text-foreground/80">
            <li>Terms are violated</li>
            <li>The Service is misused</li>
            <li>Required by law</li>
          </ul>
          <p className="leading-relaxed text-foreground/80">
            You may discontinue use at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            11. Changes to Terms
          </h2>
          <p className="leading-relaxed text-foreground/80">
            We may update these Terms. Continued use after updates constitutes
            acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            12. Contact Information
          </h2>
          <p className="leading-relaxed text-foreground/80">
            For questions regarding these Terms:
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
