-- Reference data that mirrors lib/categories.js and content/authors/*.json,
-- so existing category URLs and author pages keep working once the database
-- becomes the source of truth. Safe to re-run: existing rows are left as they are.

insert into public.categories (slug, name, short_name, description, sort_order) values
  ('personal-finance', 'Personal Finance', 'Personal Finance',
   'Budgeting, goal planning and everyday money habits explained for Indian households.', 10),
  ('banking', 'Banking', 'Banking',
   'How savings accounts, deposits, statements and digital payments work, and how to use them safely.', 20),
  ('loans-and-credit', 'Loans and Credit', 'Loans & Credit',
   'Credit scores, interest rates, EMIs and borrowing decisions, explained without jargon.', 30),
  ('saving-money', 'Saving Money', 'Saving',
   'Emergency funds, spending habits and practical ways to build savings steadily.', 40),
  ('investment-education', 'Investment Education', 'Investing',
   'Foundational concepts such as risk, return, inflation and diversification, for learning rather than tips.', 50),
  ('mutual-funds', 'Mutual Funds', 'Mutual Funds',
   'How mutual funds, SIPs, NAVs and expense ratios work, with the risks explained alongside the benefits.', 60),
  ('insurance-education', 'Insurance Education', 'Insurance',
   'Understanding health, life and general insurance terms so you can read a policy with confidence.', 70),
  ('tax-and-gst', 'Tax and GST', 'Tax & GST',
   'Income tax and GST basics for individuals. Rules change every year, so always confirm with official sources.', 80),
  ('financial-news-and-updates', 'Financial News and Updates', 'News & Updates',
   'Explainers on regulatory changes and announcements, linked to the official source wherever possible.', 90)
on conflict (slug) do nothing;

insert into public.authors (slug, name, role, bio, expertise, credentials, links, is_organization) values
  ('editorial-team', 'FinanceBlogg Editorial Team', 'Editorial Team',
   'The FinanceBlogg editorial team researches and writes educational explainers on personal finance in India. Articles are based on official sources such as the Reserve Bank of India, SEBI, IRDAI and the Income Tax Department, and are updated when rules change.',
   array['Budgeting and saving', 'Banking basics', 'Credit and loans', 'Mutual fund concepts', 'Health insurance terms', 'Income tax basics'],
   array[]::text[], '{}'::jsonb, true)
on conflict (slug) do nothing;
