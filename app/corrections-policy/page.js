import StaticPage, { staticPageMetadata } from "@/components/StaticPage";

export const metadata = staticPageMetadata("corrections-policy", "/corrections-policy");

export default function CorrectionsPolicyPage() {
  return <StaticPage slug="corrections-policy" />;
}
