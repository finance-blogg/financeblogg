import { siteConfig } from "@/lib/site";

/**
 * Shown only when NEXT_PUBLIC_NEWSLETTER_URL points to a real signup page run
 * by a newsletter provider. This site does not collect email addresses itself.
 */
export default function NewsletterCta({ className = "" }) {
  if (!siteConfig.newsletterUrl) return null;
  return (
    <section aria-labelledby="newsletter-heading" className={`rounded-lg bg-navy-950 p-6 text-white ${className}`}>
      <h2 id="newsletter-heading" className="font-serif text-xl font-semibold">
        Get new explainers by email
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-navy-200">
        An occasional email when we publish a new article. Unsubscribe any time.
      </p>
      <a
        href={siteConfig.newsletterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block rounded-md bg-leaf-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-leaf-200"
      >
        Subscribe<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </section>
  );
}
