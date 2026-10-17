/**
 * Google AdSense configuration.
 *
 * Nothing here is hard-coded: the publisher ID and slot IDs come from
 * environment variables. If a value is missing or malformed, the related
 * script or ad unit is simply not rendered. No placeholder ads are shown.
 *
 * NEXT_PUBLIC_* variables must be referenced literally so Next.js can inline them.
 */

const PUBLISHER_ID_PATTERN = /^ca-pub-\d{10,20}$/;
const SLOT_ID_PATTERN = /^\d{6,20}$/;

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validSlot(value) {
  const slot = clean(value);
  return SLOT_ID_PATTERN.test(slot) ? slot : null;
}

const rawClient = clean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);

export const adsenseClient = PUBLISHER_ID_PATTERN.test(rawClient)
  ? rawClient
  : null;

export const adsenseConfigured = Boolean(adsenseClient);

/**
 * Manual ad placements. Each maps to an ad unit you create in the AdSense
 * dashboard (Ads > By ad unit). Leave a variable empty to disable that placement.
 */
export const adPlacements = {
  articleInline: {
    slot: validSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_INLINE),
    format: "auto",
    minHeight: 280,
  },
  articleEnd: {
    slot: validSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_END),
    format: "auto",
    minHeight: 280,
  },
  sidebar: {
    slot: validSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR),
    format: "auto",
    minHeight: 250,
  },
  homeFeed: {
    slot: validSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_FEED),
    format: "auto",
    minHeight: 250,
  },
  listing: {
    slot: validSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT_LISTING),
    format: "auto",
    minHeight: 250,
  },
};

export function getPlacement(name) {
  if (!adsenseClient) return null;
  const placement = adPlacements[name];
  if (!placement || !placement.slot) return null;
  return placement;
}

/** "ca-pub-123" -> "pub-123", the form used in ads.txt. */
export function adsTxtPublisherId() {
  return adsenseClient ? adsenseClient.replace(/^ca-/, "") : null;
}
