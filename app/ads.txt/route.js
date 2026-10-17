import { adsTxtPublisherId } from "@/lib/ads";

/**
 * Serves /ads.txt from NEXT_PUBLIC_ADSENSE_CLIENT. f08c47fec0942fa0 is Google's
 * published certification authority ID for ads.txt records.
 * Returns 404 until a valid publisher ID is configured. Rebuild after changing it.
 */
export function GET() {
  const publisherId = adsTxtPublisherId();
  if (!publisherId) {
    return new Response("ads.txt is not configured.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
