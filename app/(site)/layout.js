import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AdSenseScript from "@/components/ads/AdSenseScript";
import { adsenseClient } from "@/lib/ads";

export const metadata = {
  ...(adsenseClient ? { other: { "google-adsense-account": adsenseClient } } : {}),
};

export default function SiteLayout({ children }) {
  return (
    <>
      <AdSenseScript />
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
