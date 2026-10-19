import StaticPage, { staticPageMetadata } from "@/components/StaticPage";

export const metadata = staticPageMetadata("disclaimer", "/disclaimer");

export default function DisclaimerPage() {
  return <StaticPage slug="disclaimer" />;
}
