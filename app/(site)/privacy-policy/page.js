import StaticPage, { staticPageMetadata } from "@/components/StaticPage";

export const metadata = staticPageMetadata("privacy-policy", "/privacy-policy");

export default function PrivacyPolicyPage() {
  return <StaticPage slug="privacy-policy" />;
}
