import { adsenseClient } from "@/lib/ads";

/**
 * Loads the official AdSense library once per page, only when a valid
 * NEXT_PUBLIC_ADSENSE_CLIENT is set. The same tag enables Auto ads if you turn
 * them on in the AdSense dashboard.
 */
export default function AdSenseScript() {
  if (!adsenseClient) return null;
  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
      crossOrigin="anonymous"
    />
  );
}
