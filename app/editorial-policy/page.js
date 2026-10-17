import StaticPage, { staticPageMetadata } from "@/components/StaticPage";

export const metadata = staticPageMetadata("editorial-policy", "/editorial-policy");

export default function EditorialPolicyPage() {
  return <StaticPage slug="editorial-policy" />;
}
