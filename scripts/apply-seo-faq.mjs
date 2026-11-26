#!/usr/bin/env node
/**
 * One-shot helper: inject seo.title (when long) and faq blocks into cornerstone MDX articles.
 * Safe to re-run: skips files that already have a faq: key.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "content", "articles");

const faqsBySlug = {
  "how-to-create-a-monthly-budget-in-india": [
    {
      question: "Should I budget from CTC or take-home salary?",
      answer:
        "Use take-home (net) income. CTC includes employer contributions and deductions you never receive in your bank account, so budgeting from CTC overstates what you can spend.",
    },
    {
      question: "What is a sinking fund in a household budget?",
      answer:
        "A sinking fund is money set aside every month for costs that arrive once or twice a year—festivals, school fees, insurance premiums—so they do not feel like emergencies.",
    },
    {
      question: "Do I need a 50/30/20 budget rule?",
      answer:
        "No. Rules like 50/30/20 are starting points. Rent, EMIs and family support in India often need a different split. The useful part is planning income and expenses before the month starts.",
    },
  ],
  "emergency-fund-how-much-should-you-save": [
    {
      question: "How many months of expenses should an emergency fund cover?",
      answer:
        "Many households aim for a few months of essential expenses, then adjust for job stability, dependents and health cover. There is no single number that fits everyone.",
    },
    {
      question: "Where should I keep an emergency fund?",
      answer:
        "Keep the first layer in a liquid place you can access quickly, such as a savings account. Larger amounts may be split across deposits or other liquid options after you understand charges and access times.",
    },
    {
      question: "Is an emergency fund the same as investing?",
      answer:
        "No. An emergency fund prioritises access and stability. Investing for long-term goals usually accepts market ups and downs and is a separate decision.",
    },
  ],
  "basics-of-income-tax-in-india": [
    {
      question: "Is this article tax filing advice?",
      answer:
        "No. It explains basic concepts so you can read official materials. Use the Income Tax Department tools and, if needed, a qualified professional for your own filing.",
    },
    {
      question: "Do tax slabs stay the same every year?",
      answer:
        "No. Slabs, rebates and deductions can change with each Finance Act. Always verify the figures for the financial year you are filing for.",
    },
    {
      question: "What is the difference between old and new tax regimes?",
      answer:
        "Broadly, the new regime uses different slab rates with fewer common deductions, while the old regime may allow more deductions if you claim them. Compare both with official calculators for your year.",
    },
  ],
  "old-vs-new-tax-regime-india-how-to-compare": [
    {
      question: "How do I choose between the old and new tax regimes?",
      answer:
        "List the same income once, then compute tax both ways with official tools for that financial year. Include only deductions you actually claim under the old regime.",
    },
    {
      question: "Can I switch regimes every year?",
      answer:
        "Salaried individuals often can choose each year when filing, but rules for business income and employer payroll choices can differ. Confirm the current year’s rules on the e-filing portal.",
    },
    {
      question: "Should I pick a regime based on social media calculators?",
      answer:
        "Treat third-party calculators as estimates only. Prefer the Income Tax Department tools and the Finance Act text for that year.",
    },
  ],
  "understanding-sip-and-mutual-fund-investing": [
    {
      question: "What is an SIP in mutual funds?",
      answer:
        "A Systematic Investment Plan (SIP) invests a fixed amount at regular intervals into a mutual fund scheme. It is a way of investing, not a separate product type.",
    },
    {
      question: "Does SIP guarantee returns?",
      answer:
        "No. Mutual fund returns depend on markets and the scheme. Past performance is not a promise of future results.",
    },
    {
      question: "Is SIP better than a lump sum?",
      answer:
        "Neither is automatically better. SIP can spread purchase timing; a lump sum invests money you already have. Choice depends on cash flow, goals and risk—not tips.",
    },
  ],
  "how-credit-scores-work-in-india": [
    {
      question: "What is a credit score in India?",
      answer:
        "A credit score is a number lenders use to summarise your credit history from bureau reports. Higher scores generally mean stronger repayment history, but lenders also use their own policies.",
    },
    {
      question: "Does checking my own credit report lower my score?",
      answer:
        "A soft check you initiate for your own report usually does not affect scoring the way a hard enquiry from a lender application can. Confirm details with the bureau you use.",
    },
    {
      question: "How can errors on a credit report be fixed?",
      answer:
        "Dispute incorrect entries through the credit bureau’s process and keep records of supporting documents. Resolution timelines vary; follow the bureau’s official steps.",
    },
  ],
  "how-loan-emi-is-calculated": [
    {
      question: "How is an EMI calculated?",
      answer:
        "An EMI is usually calculated so that each payment covers interest for the period plus some principal. Early EMIs are often mostly interest; later ones repay more principal.",
    },
    {
      question: "Does a longer tenure always help?",
      answer:
        "A longer tenure can lower the monthly EMI but usually increases total interest paid. Compare both EMI and total cost before choosing.",
    },
    {
      question: "Is the Key Fact Statement important?",
      answer:
        "Yes. For many retail loans, lenders provide a Key Fact Statement that summarises rate, fees and repayment terms. Read it before you sign.",
    },
  ],
  "savings-account-vs-fixed-deposit": [
    {
      question: "When is a savings account better than a fixed deposit?",
      answer:
        "A savings account suits money you may need soon. Fixed deposits usually offer higher interest for money you can lock for a set tenure, subject to premature withdrawal rules.",
    },
    {
      question: "Are bank deposits insured in India?",
      answer:
        "Eligible bank deposits are covered by DICGC up to the limit per depositor per bank under the same right and capacity. Confirm the current limit on dicgc.org.in.",
    },
    {
      question: "Is FD interest tax-free?",
      answer:
        "Interest on fixed deposits is generally taxable. TDS may apply above thresholds. Verify current rules for your tax year.",
    },
  ],
  "how-to-compare-health-insurance-policies": [
    {
      question: "What should I compare beyond premium?",
      answer:
        "Compare sum insured, waiting periods, exclusions, room limits, co-pays, sub-limits, restoration benefits and claim process—not only the annual premium.",
    },
    {
      question: "Does a cheaper policy always mean better value?",
      answer:
        "No. A lower premium can hide tight sub-limits or long waiting periods. Read the policy wording and prospectus carefully.",
    },
    {
      question: "Where can I verify insurer rules?",
      answer:
        "Use IRDAI resources and the insurer’s official policy documents. Do not rely on informal forwards or screenshots alone.",
    },
  ],
  "what-deposit-insurance-covers-in-india": [
    {
      question: "What does DICGC deposit insurance cover?",
      answer:
        "DICGC insures eligible deposits in insured banks up to a limit per depositor per bank under the same right and capacity. Confirm the current limit and covered deposit types on dicgc.org.in.",
    },
    {
      question: "Are deposits in different branches separately insured?",
      answer:
        "Branches of the same bank are generally one bucket for the same depositor and capacity. Deposits in different banks are usually separate.",
    },
    {
      question: "Are NBFC deposits covered by DICGC?",
      answer:
        "DICGC cover applies to eligible deposits with insured banks. NBFCs are generally outside this bank deposit insurance scheme—verify product-specific protections separately.",
    },
  ],
  "neft-rtgs-imps-upi-differences-india": [
    {
      question: "What is the difference between NEFT, RTGS, IMPS and UPI?",
      answer:
        "They are different payment systems with different settlement styles, typical use cases and operating rules. Always confirm current limits and hours with your bank and RBI/NPCI sources.",
    },
    {
      question: "Is UPI safer than other transfers?",
      answer:
        "Safety depends on how you use it—PIN protection, verifying payee details, and ignoring phishing. No system removes the need for basic fraud hygiene.",
    },
    {
      question: "What should I do if a UPI payment fails?",
      answer:
        "Check the transaction status in your app, wait for the automated reversal if money was debited, and contact your bank through official channels if needed.",
    },
  ],
  "how-to-read-form-16": [
    {
      question: "What is Form 16?",
      answer:
        "Form 16 is a TDS certificate employers issue to salaried employees. It summarises salary, deductions claimed through payroll, and tax deducted.",
    },
    {
      question: "Should Form 16 match Form 26AS?",
      answer:
        "TDS figures should generally reconcile with Form 26AS/AIS. Differences need checking before you file.",
    },
    {
      question: "Is Form 16 enough to file a return?",
      answer:
        "Often it is a key document for salaried filers, but you may also need interest certificates, capital gains statements and other income details.",
    },
  ],
  "ctc-vs-take-home-salary-in-india": [
    {
      question: "What is CTC?",
      answer:
        "Cost to Company (CTC) is the employer’s total cost of employing you, including benefits and contributions that may not appear in your monthly bank credit.",
    },
    {
      question: "Why is take-home less than CTC?",
      answer:
        "PF, professional tax, income tax and other deductions reduce what reaches your account. Some CTC items are benefits, not cash salary.",
    },
    {
      question: "Which figure should I use for budgeting?",
      answer:
        "Use take-home pay for monthly budgeting. Use CTC mainly when comparing job offers or understanding employer cost.",
    },
  ],
  "mutual-fund-expense-ratio-explained-india": [
    {
      question: "What is an expense ratio?",
      answer:
        "The expense ratio (TER) is the annual cost charged by a mutual fund scheme, expressed as a percentage of assets. It is deducted from the scheme, not usually paid as a separate bill.",
    },
    {
      question: "Is a lower expense ratio always better?",
      answer:
        "Lower costs help, but they are only one factor. Scheme objective, risk, tracking difference (for index funds) and fit for your goal also matter.",
    },
    {
      question: "Is expense ratio the same as exit load?",
      answer:
        "No. Expense ratio is an ongoing fund cost. Exit load is a charge that may apply if you redeem within a stated period.",
    },
  ],
  "how-term-life-insurance-works-in-india": [
    {
      question: "What does term life insurance typically pay?",
      answer:
        "A term plan generally pays a death benefit to nominees if the life assured dies during the policy term, subject to exclusions and claim conditions in the policy.",
    },
    {
      question: "Is term insurance an investment?",
      answer:
        "Pure term cover is primarily protection, not a savings or investment product. Do not treat it as a return-generating instrument.",
    },
    {
      question: "Where can I verify insurer conduct rules?",
      answer:
        "Use IRDAI resources and the insurer’s policy documents. Read exclusions, waiting periods if any, and claim requirements carefully.",
    },
  ],
  "how-public-provident-fund-works-in-india": [
    {
      question: "What is PPF?",
      answer:
        "The Public Provident Fund is a small-savings scheme with a fixed tenure, deposit limits and interest set by the government for each quarter. Rules can change—verify on official pages.",
    },
    {
      question: "Can I withdraw from PPF anytime?",
      answer:
        "PPF has restrictions on premature closure and withdrawals. Check the current scheme rules before treating balances as fully liquid.",
    },
    {
      question: "Is PPF interest fixed forever?",
      answer:
        "No. Interest rates for small savings schemes are reviewed periodically. Confirm the applicable rate for the current quarter from official notifications.",
    },
  ],
  "direct-vs-regular-mutual-fund-plans": [
    {
      question: "What is the difference between direct and regular plans?",
      answer:
        "Direct plans are bought without a distributor commission embedded in the expense structure; regular plans include distribution costs. Both invest in the same scheme portfolio.",
    },
    {
      question: "Does direct always mean higher returns?",
      answer:
        "Direct plans usually have a lower expense ratio, which can improve net returns versus the same scheme’s regular plan, but markets still drive outcomes and nothing is guaranteed.",
    },
    {
      question: "Where can I verify plan type?",
      answer:
        "Check your account statement, factsheet or registrar/AMC records. SEBI and AMFI investor education pages explain the concepts.",
    },
  ],
  "what-is-an-index-fund-in-india": [
    {
      question: "What is an index fund?",
      answer:
        "An index fund aims to track a market index rather than beat it through active stock picking. Returns will differ slightly from the index because of costs and tracking difference.",
    },
    {
      question: "Is a low NAV better for an index fund?",
      answer:
        "No. NAV is the price per unit, not a discount. Compare objective, TER, tracking difference and your goal—not a “cheap” NAV.",
    },
    {
      question: "Are index funds risk-free?",
      answer:
        "No. They still move with the market they track. Equity index funds can fall when markets fall.",
    },
  ],
  "how-to-read-a-mutual-fund-factsheet": [
    {
      question: "What is a mutual fund factsheet?",
      answer:
        "A factsheet is a periodic summary of a scheme’s objective, portfolio, performance history, costs and risk indicators. It is educational material, not a personal recommendation.",
    },
    {
      question: "Which factsheet fields matter for beginners?",
      answer:
        "Start with investment objective, asset allocation, top holdings, TER/expense ratio, exit load, riskometer and benchmark—then read the full offer documents for details.",
    },
    {
      question: "Does past performance guarantee future returns?",
      answer:
        "No. Factsheets show history for context. Future results can differ, sometimes sharply.",
    },
  ],
  "how-inflation-affects-your-savings": [
    {
      question: "What is inflation for a household?",
      answer:
        "Inflation is the rise in prices over time. If prices rise faster than your savings grow after tax, your money buys less in the future.",
    },
    {
      question: "Which inflation number should I watch in India?",
      answer:
        "Headline CPI from MoSPI is the common consumer inflation reference. Read the official release rather than viral summaries alone.",
    },
    {
      question: "Does a higher interest rate always beat inflation?",
      answer:
        "Not automatically. Compare after-tax returns with inflation over your time horizon. Short deposits and long goals need different thinking.",
    },
  ],
};

const seoTitleBySlug = {
  "direct-vs-regular-mutual-fund-plans": "Direct vs Regular Mutual Fund Plans in India",
  "floating-vs-fixed-rate-loans-in-india": "Floating vs Fixed Rate Loans in India",
  "health-insurance-deductible-copay-india": "Health Insurance Deductible and Copay in India",
  "how-to-read-irdai-health-insurance-circulars": "How to Read IRDAI Health Circulars",
  "how-to-track-net-worth-in-india": "How to Track Net Worth in India",
  "how-to-understand-gst-council-decisions-for-households": "How Households Can Read GST Council Decisions",
  "neft-rtgs-imps-upi-differences-india": "NEFT vs RTGS vs IMPS vs UPI in India",
  "savings-account-vs-fixed-deposit": "Savings Account vs Fixed Deposit in India",
  "what-is-a-basic-savings-bank-deposit-account-in-india": "What Is a BSBDA Bank Account in India?",
};

function yamlQuote(s) {
  return `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function faqYaml(faqs) {
  const lines = ["faq:"];
  for (const f of faqs) {
    lines.push(`  - question: ${yamlQuote(f.question)}`);
    lines.push(`    answer: ${yamlQuote(f.answer)}`);
  }
  return lines.join("\n");
}

function seoYaml(title) {
  return ["seo:", `  title: ${yamlQuote(title)}`].join("\n");
}

let updated = 0;
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith(".mdx") || name.startsWith("_")) continue;
  const file = path.join(dir, name);
  const raw = fs.readFileSync(file, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) continue;
  let fm = match[1];
  const body = match[2];
  const slugMatch = fm.match(/^slug:\s*(.+)$/m);
  const slug = (slugMatch ? slugMatch[1].trim() : name.replace(/\.mdx$/, "")).replace(/^["']|["']$/g, "");

  const wantsFaq = faqsBySlug[slug];
  const wantsSeo = seoTitleBySlug[slug];
  if (!wantsFaq && !wantsSeo) continue;

  let changed = false;
  if (wantsFaq && !/^faq:/m.test(fm)) {
    fm = `${fm.trimEnd()}\n${faqYaml(wantsFaq)}\n`;
    changed = true;
  }
  if (wantsSeo && !/^seo:/m.test(fm)) {
    fm = `${fm.trimEnd()}\n${seoYaml(wantsSeo)}\n`;
    changed = true;
  }
  if (!changed) continue;

  fs.writeFileSync(file, `---\n${fm.trim()}\n---\n${body}`);
  updated += 1;
  console.log(`updated ${slug}`);
}

console.log(`Done. Updated ${updated} articles.`);
