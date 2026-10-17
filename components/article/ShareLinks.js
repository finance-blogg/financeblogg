import CopyLinkButton from "./CopyLinkButton";

export default function ShareLinks({ url, title }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { name: "WhatsApp", href: `https://wa.me/?text=${t}%20${u}` },
    { name: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { name: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { name: "Email", href: `mailto:?subject=${t}&body=${u}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium text-navy-700">Share:</span>
      {links.map((l) => (
        <a
          key={l.name}
          href={l.href}
          target={l.name === "Email" ? undefined : "_blank"}
          rel="noopener noreferrer"
          className="rounded-full border border-navy-200 px-3 py-1 text-sm text-navy-700 transition-colors hover:border-leaf-600 hover:text-leaf-700"
        >
          {l.name}
          {l.name !== "Email" && <span className="sr-only"> (opens in a new tab)</span>}
        </a>
      ))}
      <CopyLinkButton url={url} />
    </div>
  );
}
