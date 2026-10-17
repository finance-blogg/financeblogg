import AdUnit from "./AdUnit";
import { adsenseClient, getPlacement } from "@/lib/ads";

/**
 * A clearly labelled advertising area, visually separated from editorial
 * content. Renders nothing when AdSense or the placement is not configured,
 * so no empty boxes or placeholder ads appear.
 */
export default function AdSlot({ placement, className = "" }) {
  const config = getPlacement(placement);
  if (!config) return null;

  return (
    <aside
      aria-label="Advertisement"
      className={`ad-slot not-prose my-10 rounded-md border border-dashed border-navy-200 bg-navy-50/50 px-3 pt-2 pb-3 ${className}`}
    >
      <p className="mb-2 text-center text-[0.65rem] font-medium tracking-[0.18em] text-navy-400 uppercase">
        Advertisement
      </p>
      <div style={{ minHeight: config.minHeight }}>
        <AdUnit client={adsenseClient} slot={config.slot} format={config.format} />
      </div>
    </aside>
  );
}
