import { notFound } from "next/navigation";

// Unknown /admin URLs render app/admin/not-found.js (no public chrome or ads)
// instead of the site-wide 404 page.
export default function AdminCatchAll() {
  notFound();
}
