import BlogListing from "@/components/article/BlogListing";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "All Articles",
  description:
    "Browse every FinanceBlogg explainer on budgeting, banking, credit, saving, mutual funds, insurance and tax in India.",
  path: "/blog",
});

export default function BlogIndexPage() {
  return <BlogListing page={1} />;
}
