import Script from "next/script";

const MEASUREMENT_ID = "G-2ZZV8WSZGS";

/**
 * Google tag (gtag.js) for Google Analytics 4. next/script injects it into
 * <head> once per visit; GA4 enhanced measurement records client-side
 * navigations as page views.
 */
export default function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
