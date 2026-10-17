import Link from "next/link";
import Callout from "./Callout";
import AdSlot from "@/components/ads/AdSlot";
import { siteConfig } from "@/lib/site";

function MdxLink({ href = "", children, ...props }) {
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function KeyTakeaways({ children }) {
  return (
    <aside className="not-prose my-8 rounded-lg bg-navy-950 px-6 py-5 text-navy-100" aria-label="Key takeaways">
      <p className="text-xs font-semibold tracking-[0.12em] text-leaf-200 uppercase">Key takeaways</p>
      <div className="mt-3 text-[1rem] leading-relaxed [&_li]:mt-2 [&_li]:ml-5 [&_strong]:text-white [&_ul]:list-disc [&_ul]:marker:text-leaf-500">
        {children}
      </div>
    </aside>
  );
}

/** Highlights text the site owner must complete before launch. */
function OwnerTodo({ children }) {
  return (
    <mark className="rounded bg-amber-100 px-1 py-0.5 text-amber-950 ring-1 ring-amber-300">
      [OWNER_TODO: {children}]
    </mark>
  );
}

/** A manual in-article ad break. Renders nothing until AdSense is configured. */
function AdBreak() {
  return <AdSlot placement="articleInline" />;
}

/** Renders a config value, or a visible OWNER_TODO marker if it is not filled in. */
function ConfigValue({ value, todo }) {
  if (!value || String(value).includes("OWNER_TODO")) {
    return <OwnerTodo>{todo}</OwnerTodo>;
  }
  return <>{value}</>;
}

const SiteName = () => <>{siteConfig.name}</>;
const SiteUrl = () => <>{siteConfig.url}</>;
const OwnerName = () => <ConfigValue value={siteConfig.ownerName} todo="legal name of the site owner (lib/site.js)" />;
const OwnerLocation = () => <ConfigValue value={siteConfig.ownerLocation} todo="owner location (lib/site.js)" />;
const Jurisdiction = () => <ConfigValue value={siteConfig.jurisdiction} todo="governing-law jurisdiction (lib/site.js)" />;

function ContactEmail() {
  if (!siteConfig.contactEmail) {
    return <OwnerTodo>set NEXT_PUBLIC_CONTACT_EMAIL</OwnerTodo>;
  }
  return <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>;
}

export const mdxComponents = {
  a: MdxLink,
  Callout,
  KeyTakeaways,
  OwnerTodo,
  AdBreak,
  SiteName,
  SiteUrl,
  OwnerName,
  OwnerLocation,
  Jurisdiction,
  ContactEmail,
};
