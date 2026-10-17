import { ogSize, renderOgImage } from "@/lib/og";
import { siteConfig } from "@/lib/site";

export const size = ogSize;
export const contentType = "image/png";
export const alt = `${siteConfig.name}: ${siteConfig.tagline}`;

export default function Image() {
  return renderOgImage({
    eyebrow: "Personal finance explainers",
    title: siteConfig.tagline,
    footer: "Educational content, not personalised financial advice",
  });
}
