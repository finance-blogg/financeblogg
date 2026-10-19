import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import ContactForm from "@/components/forms/ContactForm";
import { isContactDeliveryConfigured } from "@/lib/contact-delivery";
import { siteConfig } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact Us",
  description: `Contact the ${siteConfig.name} editorial team with questions, corrections or feedback.`,
  path: "/contact",
});

export default function ContactPage() {
  const deliveryConfigured = isContactDeliveryConfigured();
  const showForm = deliveryConfigured || process.env.NODE_ENV === "development";

  return (
    <>
      <PageHeader
        title="Contact us"
        description="Questions, feedback and correction requests are welcome. We read every message."
        breadcrumbs={[{ name: "Contact Us" }]}
      />
      <div className="container-page mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="max-w-2xl">
          {!deliveryConfigured && process.env.NODE_ENV === "development" && (
            <p className="mb-6 rounded-md border-2 border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
              Development notice: the form is not connected to an email service. Set RESEND_API_KEY,
              CONTACT_TO_EMAIL and CONTACT_FROM_EMAIL to enable delivery. Without them, the form is
              hidden in production and visitors see the email address instead.
            </p>
          )}
          {showForm ? (
            <ContactForm />
          ) : (
            <div className="rounded-lg border border-navy-100 bg-navy-50/60 p-6">
              <h2 className="font-serif text-xl font-semibold text-navy-950">Email us</h2>
              {siteConfig.contactEmail ? (
                <p className="mt-2 text-navy-700">
                  Write to{" "}
                  <a href={`mailto:${siteConfig.contactEmail}`} className="link-underline font-medium">
                    {siteConfig.contactEmail}
                  </a>
                  .
                </p>
              ) : (
                <p className="mt-2 text-navy-700">Contact details will be published here shortly.</p>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-6 text-[0.95rem] leading-relaxed text-navy-700">
          {siteConfig.contactEmail && (
            <div>
              <h2 className="font-semibold text-navy-950">Email</h2>
              <a href={`mailto:${siteConfig.contactEmail}`} className="link-underline">
                {siteConfig.contactEmail}
              </a>
            </div>
          )}
          <div>
            <h2 className="font-semibold text-navy-950">Corrections</h2>
            <p>
              If you think something we published is wrong or out of date, choose “Correction request”
              and include the article link. See our{" "}
              <Link href="/corrections-policy" className="link-underline">corrections policy</Link>.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-navy-950">What we cannot help with</h2>
            <p>
              We are an educational publication. We cannot review your personal finances, recommend
              specific products, or resolve complaints about a bank, insurer or fund house. For
              complaints, contact the institution first and then the relevant regulator’s grievance
              portal, such as the RBI’s Complaint Management System or IRDAI’s Bima Bharosa.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
