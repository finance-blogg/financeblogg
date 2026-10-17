export const categories = [
  {
    slug: "personal-finance",
    name: "Personal Finance",
    shortName: "Personal Finance",
    description:
      "Budgeting, goal planning and everyday money habits explained for Indian households.",
  },
  {
    slug: "banking",
    name: "Banking",
    shortName: "Banking",
    description:
      "How savings accounts, deposits, statements and digital payments work, and how to use them safely.",
  },
  {
    slug: "loans-and-credit",
    name: "Loans and Credit",
    shortName: "Loans & Credit",
    description:
      "Credit scores, interest rates, EMIs and borrowing decisions, explained without jargon.",
  },
  {
    slug: "saving-money",
    name: "Saving Money",
    shortName: "Saving",
    description:
      "Emergency funds, spending habits and practical ways to build savings steadily.",
  },
  {
    slug: "investment-education",
    name: "Investment Education",
    shortName: "Investing",
    description:
      "Foundational concepts such as risk, return, inflation and diversification, for learning rather than tips.",
  },
  {
    slug: "mutual-funds",
    name: "Mutual Funds",
    shortName: "Mutual Funds",
    description:
      "How mutual funds, SIPs, NAVs and expense ratios work, with the risks explained alongside the benefits.",
  },
  {
    slug: "insurance-education",
    name: "Insurance Education",
    shortName: "Insurance",
    description:
      "Understanding health, life and general insurance terms so you can read a policy with confidence.",
  },
  {
    slug: "tax-and-gst",
    name: "Tax and GST",
    shortName: "Tax & GST",
    description:
      "Income tax and GST basics for individuals. Rules change every year, so always confirm with official sources.",
  },
  {
    slug: "financial-news-and-updates",
    name: "Financial News and Updates",
    shortName: "News & Updates",
    description:
      "Explainers on regulatory changes and announcements, linked to the official source wherever possible.",
  },
];

const bySlug = new Map(categories.map((c) => [c.slug, c]));

export function getCategory(slug) {
  return bySlug.get(slug) || null;
}

export function categoryHref(slug) {
  return `/category/${slug}`;
}
