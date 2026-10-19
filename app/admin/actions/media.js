"use server";

import { randomUUID } from "node:crypto";
import { authorizeAction } from "@/lib/auth/admin";
import { MEDIA_BUCKET } from "@/lib/supabase/config";
import { EXTENSIONS, MAX_IMAGE_BYTES, sniffImage } from "@/lib/cms/image-sniff";
import { listMedia, UUID_PATTERN } from "@/lib/cms/admin-data";
import { invalidateArticles } from "@/lib/cms/revalidate";

const MEDIA_COLUMNS = "id,storage_path,public_url,alt_text,mime_type,size_bytes,width,height,original_filename,created_at,updated_at";

function cleanText(value, max) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function cleanFilename(name) {
  return cleanText(String(name || "").split(/[\\/]/).pop(), 255);
}

/** Validates an uploaded file by size and by its actual bytes. */
async function readImage(file) {
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return { error: "Choose an image file to upload." };
  }
  if (file.size === 0) return { error: "The file is empty." };
  if (file.size > MAX_IMAGE_BYTES) return { error: `The image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB. Resize or compress it first.` };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) return { error: "The image is too large." };
  const info = sniffImage(bytes);
  if (!info) return { error: "Only JPEG, PNG, WebP, GIF or AVIF images can be uploaded. SVG and other formats are not accepted." };
  return { bytes, info };
}

function storagePath(mime) {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}/${month}/${randomUUID()}.${EXTENSIONS[mime]}`;
}

async function putObject(supabase, bytes, info) {
  const path = storagePath(info.mime);
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, bytes, {
    contentType: info.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[cms] storage upload failed:", error.message);
    return { error: "The image could not be stored. Check that the article-images bucket exists (see README) and try again." };
  }
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function uploadMedia(formData) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { supabase } = auth.ctx;

  const file = formData.get("file");
  const image = await readImage(file);
  if (image.error) return { ok: false, error: image.error };

  const stored = await putObject(supabase, image.bytes, image.info);
  if (stored.error) return { ok: false, error: stored.error };

  const { data, error } = await supabase
    .from("media")
    .insert({
      storage_path: stored.path,
      public_url: stored.url,
      alt_text: cleanText(formData.get("alt"), 300),
      mime_type: image.info.mime,
      size_bytes: image.bytes.length,
      width: image.info.width,
      height: image.info.height,
      original_filename: cleanFilename(file.name),
    })
    .select(MEDIA_COLUMNS)
    .single();
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([stored.path]);
    console.error("[cms] media insert failed:", error.message);
    return { ok: false, error: "The image was not saved to the library. Try again." };
  }
  return { ok: true, item: data, message: "Image uploaded." };
}

export async function listMediaItems({ page = 1 } = {}) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  return { ok: true, ...(await listMedia(auth.ctx.supabase, { page: safePage })) };
}

export async function updateMediaAlt({ id, alt }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  if (!UUID_PATTERN.test(String(id))) return { ok: false, error: "Unknown image." };
  const { data, error } = await auth.ctx.supabase
    .from("media")
    .update({ alt_text: cleanText(alt, 300) })
    .eq("id", id)
    .select(MEDIA_COLUMNS)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "The alt text could not be saved." };
  return { ok: true, item: data, message: "Alt text saved. Articles keep their own alt text; update them in the editor if needed." };
}

async function articlesUsing(supabase, item) {
  const [featured, inBody] = await Promise.all([
    supabase.from("articles").select("id,slug,title,status,category_slug,author_slug").eq("featured_image_url", item.public_url),
    supabase.from("articles").select("id,slug,title,status,category_slug,author_slug,body").ilike("body", `%${item.storage_path}%`),
  ]);
  if (featured.error || inBody.error) throw new Error("[cms] could not check image usage");
  return { featured: featured.data, inBody: inBody.data };
}

/** Uploads a new file for an existing library item and repoints every article that uses it. */
export async function replaceMedia(formData) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { supabase } = auth.ctx;

  const id = String(formData.get("id") || "");
  if (!UUID_PATTERN.test(id)) return { ok: false, error: "Unknown image." };
  const { data: current } = await supabase.from("media").select(MEDIA_COLUMNS).eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "This image no longer exists." };

  const image = await readImage(formData.get("file"));
  if (image.error) return { ok: false, error: image.error };
  const stored = await putObject(supabase, image.bytes, image.info);
  if (stored.error) return { ok: false, error: stored.error };

  const usage = await articlesUsing(supabase, current);
  const { data: updated, error } = await supabase
    .from("media")
    .update({
      storage_path: stored.path,
      public_url: stored.url,
      mime_type: image.info.mime,
      size_bytes: image.bytes.length,
      width: image.info.width,
      height: image.info.height,
      original_filename: cleanFilename(formData.get("file")?.name),
    })
    .eq("id", id)
    .select(MEDIA_COLUMNS)
    .single();
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([stored.path]);
    return { ok: false, error: "The image could not be replaced." };
  }

  const failures = [];
  for (const a of usage.featured) {
    const { error: e } = await supabase
      .from("articles")
      .update({ featured_image_url: stored.url, featured_image_width: image.info.width, featured_image_height: image.info.height })
      .eq("id", a.id);
    if (e) failures.push(a.title);
  }
  for (const a of usage.inBody) {
    const { error: e } = await supabase.from("articles").update({ body: a.body.split(current.public_url).join(stored.url) }).eq("id", a.id);
    if (e) failures.push(a.title);
  }

  if (failures.length === 0) await supabase.storage.from(MEDIA_BUCKET).remove([current.storage_path]);

  const affected = [...usage.featured, ...usage.inBody].filter((a) => a.status === "published");
  if (affected.length) {
    invalidateArticles({ slugs: affected.map((a) => a.slug), categories: affected.map((a) => a.category_slug), authors: affected.map((a) => a.author_slug) });
  }

  return failures.length
    ? { ok: true, item: updated, message: `Replaced, but these articles could not be updated and still use the old file: ${failures.join(", ")}.` }
    : { ok: true, item: updated, message: `Image replaced${usage.featured.length + usage.inBody.length ? ` in ${usage.featured.length + usage.inBody.length} article(s)` : ""}.` };
}

export async function deleteMedia({ id }) {
  const auth = await authorizeAction();
  if (!auth.ok) return auth.result;
  const { supabase } = auth.ctx;
  if (!UUID_PATTERN.test(String(id))) return { ok: false, error: "Unknown image." };
  const { data: item } = await supabase.from("media").select(MEDIA_COLUMNS).eq("id", id).maybeSingle();
  if (!item) return { ok: false, error: "This image no longer exists." };

  const usage = await articlesUsing(supabase, item);
  const users = [...new Map([...usage.featured, ...usage.inBody].map((a) => [a.id, a.title])).values()];
  if (users.length) {
    return { ok: false, error: `This image is used in: ${users.join(", ")}. Choose a different image for those articles first.` };
  }

  const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove([item.storage_path]);
  if (storageError) return { ok: false, error: "The file could not be removed from storage." };
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return { ok: false, error: "The library entry could not be removed." };
  return { ok: true, message: "Image deleted." };
}
