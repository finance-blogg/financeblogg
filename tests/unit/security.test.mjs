import { test } from "node:test";
import assert from "node:assert/strict";
import { safeAdminPath } from "../../lib/auth/redirect.js";
import { hardenAuthCookie, isSessionTooOld, sessionMaxAgeSeconds, signedInAt } from "../../lib/auth/session-policy.js";
import { sniffImage, MAX_IMAGE_BYTES } from "../../lib/cms/image-sniff.js";

test("post-login redirects stay inside /admin", () => {
  const allowed = {
    "/admin": "/admin",
    "/admin/articles?status=draft": "/admin/articles?status=draft",
    "/admin/articles/123/edit": "/admin/articles/123/edit",
  };
  for (const [input, expected] of Object.entries(allowed)) assert.equal(safeAdminPath(input), expected);

  const rejected = [
    "https://evil.example/admin",
    "//evil.example/admin",
    "/\\evil.example",
    "\\\\evil.example",
    "/admin/../blog",
    "/administrator",
    "/admin/login",
    "/admin/login?next=/admin",
    "javascript:alert(1)",
    "/admin\n/x",
    "",
    null,
    undefined,
    "/blog/some-article",
    `/admin/${"a".repeat(600)}`,
  ];
  for (const input of rejected) assert.equal(safeAdminPath(input), "/admin", `should reject ${JSON.stringify(input)}`);
});

test("sessions expire a fixed time after sign-in", () => {
  const now = 1_800_000_000;
  const max = sessionMaxAgeSeconds();
  assert.equal(max, 12 * 3600);
  assert.equal(signedInAt({ amr: [{ method: "password", timestamp: now - 10 }] }), now - 10);
  assert.equal(isSessionTooOld({ amr: [{ method: "password", timestamp: now - 60 }] }, now), false);
  assert.equal(isSessionTooOld({ amr: [{ method: "password", timestamp: now - max - 1 }] }, now), true);
  assert.equal(isSessionTooOld({}, now), true);
  assert.equal(isSessionTooOld({ iat: now - 5 }, now), false);
});

test("auth cookies are HttpOnly, SameSite=Lax and capped to the session lifetime", () => {
  const cookie = hardenAuthCookie({ maxAge: 400 * 24 * 3600, httpOnly: false, sameSite: "none", path: "/x" });
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "lax");
  assert.equal(cookie.path, "/");
  assert.equal(cookie.maxAge, sessionMaxAgeSeconds());
  assert.equal(hardenAuthCookie({ maxAge: 0 }).maxAge, 0);
});

function png(width, height) {
  const b = new Uint8Array(64);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
}

function jpeg(width, height) {
  const b = new Uint8Array(64);
  b.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  b.set([0xff, 0xc0, 0x00, 0x11, 0x08], 20);
  new DataView(b.buffer).setUint16(25, height);
  new DataView(b.buffer).setUint16(27, width);
  return b;
}

function gif(width, height) {
  const b = new Uint8Array(64);
  b.set([...Buffer.from("GIF89a")]);
  new DataView(b.buffer).setUint16(6, width, true);
  new DataView(b.buffer).setUint16(8, height, true);
  return b;
}

function webpVp8x(width, height) {
  const b = new Uint8Array(64);
  b.set([...Buffer.from("RIFF")], 0);
  b.set([...Buffer.from("WEBPVP8X")], 8);
  const w = width - 1;
  const h = height - 1;
  b.set([w & 0xff, (w >> 8) & 0xff, (w >> 16) & 0xff], 24);
  b.set([h & 0xff, (h >> 8) & 0xff, (h >> 16) & 0xff], 27);
  return b;
}

test("images are identified by their bytes, not their name", () => {
  assert.deepEqual(sniffImage(png(1200, 630)), { mime: "image/png", width: 1200, height: 630 });
  assert.deepEqual(sniffImage(jpeg(800, 450)), { mime: "image/jpeg", width: 800, height: 450 });
  assert.deepEqual(sniffImage(gif(10, 20)), { mime: "image/gif", width: 10, height: 20 });
  assert.deepEqual(sniffImage(webpVp8x(1600, 900)), { mime: "image/webp", width: 1600, height: 900 });
});

test("non-images and SVG are rejected even with an image extension", () => {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const html = new TextEncoder().encode("<!doctype html><html><body><script>alert(1)</script></body></html>");
  const exe = new Uint8Array(64);
  exe.set([0x4d, 0x5a]);
  assert.equal(sniffImage(svg), null);
  assert.equal(sniffImage(html), null);
  assert.equal(sniffImage(exe), null);
  assert.equal(sniffImage(new Uint8Array(4)), null);
  assert.equal(sniffImage(png(0, 0)), null);
  assert.equal(MAX_IMAGE_BYTES, 4 * 1024 * 1024);
});
