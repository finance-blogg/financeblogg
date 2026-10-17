"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function AdIns({ client, slot, format, layout }) {
  const ref = useRef(null);

  useEffect(() => {
    const ins = ref.current;
    if (!ins || ins.getAttribute("data-adsbygoogle-status")) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers or script load failures should never break the page.
    }
  }, []);

  return (
    <ins
      ref={ref}
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
      {...(layout ? { "data-ad-layout": layout } : {})}
    />
  );
}

/**
 * Renders one manually placed AdSense unit. Only mounted by <AdSlot> when a
 * valid publisher ID and slot ID are configured. Keyed by pathname so a fresh
 * unit is requested after client-side navigation between articles.
 */
export default function AdUnit({ client, slot, format = "auto", layout }) {
  const pathname = usePathname();
  return <AdIns key={pathname} client={client} slot={slot} format={format} layout={layout} />;
}
