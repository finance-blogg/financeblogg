/**
 * Identifies an image from its first bytes (magic numbers) and reads its
 * pixel dimensions, without trusting the file name or the browser-supplied
 * MIME type. SVG is deliberately unsupported because it can contain scripts.
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function ascii(bytes, start, length) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function u16be(b, i) {
  return (b[i] << 8) | b[i + 1];
}
function u16le(b, i) {
  return b[i] | (b[i + 1] << 8);
}
function u24le(b, i) {
  return b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
}
function u32be(b, i) {
  return ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);
}

function jpegSize(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = b[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = u16be(b, i + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) return { height: u16be(b, i + 5), width: u16be(b, i + 7) };
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

function webpSize(b) {
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8X") return { width: 1 + u24le(b, 24), height: 1 + u24le(b, 27) };
  if (chunk === "VP8L") {
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  if (chunk === "VP8 ") return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  return null;
}

function avifSize(b) {
  for (let i = 0; i + 16 < b.length && i < 65536; i += 1) {
    if (b[i] === 0x69 && ascii(b, i, 4) === "ispe") {
      return { width: u32be(b, i + 8), height: u32be(b, i + 12) };
    }
  }
  return null;
}

/** Returns { mime, width, height } for a supported image, or null. */
export function sniffImage(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b.length < 32) return null;

  let mime = null;
  let size = null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    mime = "image/jpeg";
    size = jpegSize(b);
  } else if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && b[4] === 0x0d && b[5] === 0x0a && ascii(b, 12, 4) === "IHDR") {
    mime = "image/png";
    size = { width: u32be(b, 16), height: u32be(b, 20) };
  } else if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") {
    mime = "image/webp";
    size = webpSize(b);
  } else if (ascii(b, 0, 6) === "GIF87a" || ascii(b, 0, 6) === "GIF89a") {
    mime = "image/gif";
    size = { width: u16le(b, 6), height: u16le(b, 8) };
  } else if (ascii(b, 4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(b, 8, 4))) {
    mime = "image/avif";
    size = avifSize(b);
  }

  if (!mime || !size || !(size.width > 0) || !(size.height > 0) || size.width > 20000 || size.height > 20000) return null;
  return { mime, width: size.width, height: size.height };
}
