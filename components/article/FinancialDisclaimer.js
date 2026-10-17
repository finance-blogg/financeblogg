import Link from "next/link";

export default function FinancialDisclaimer({ className = "" }) {
  return (
    <aside
      aria-label="Financial education disclaimer"
      className={`rounded-lg border border-navy-100 bg-white p-4 text-sm leading-relaxed text-navy-600 ${className}`}
    >
      <p>
        <strong className="text-navy-900">For education only.</strong> This article explains general
        concepts and is not personalised financial, investment, tax or legal advice. Interest rates,
        tax rules and product terms change frequently. Confirm details with the official source or
        your bank, insurer or fund house, and consider speaking to a SEBI-registered investment
        adviser or a qualified tax professional for decisions about your situation.{" "}
        <Link href="/disclaimer" className="text-leaf-700 underline underline-offset-2">
          Full disclaimer
        </Link>
        .
      </p>
    </aside>
  );
}
