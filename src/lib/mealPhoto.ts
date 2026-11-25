import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";

/**
 * Meal photos: capture, downscale, upload, and read back.
 *
 * The plugin is imported on demand rather than at the top. It carries a web
 * implementation that would otherwise sit in the startup bundle for every
 * launch, on a path most people only reach after they have already decided to
 * log a meal.
 */
const cameraPlugin = () => import("@capacitor/camera").then((m) => m.Camera);

export const BUCKET = "meal-photos";

/** Longest edge after downscaling, in pixels. */
const MAX_EDGE = 1280;
/** JPEG quality for the upload. */
const QUALITY = 0.72;

export type PhotoSource = "camera" | "library";

/** A captured photo held in memory before it is attached to a saved meal. */
export interface CapturedPhoto {
  /** Downscaled JPEG, ready to upload. */
  blob: Blob;
  /** Object URL for previewing. Revoke it when the preview goes away. */
  previewUrl: string;
}

export const isNative = Capacitor.isNativePlatform();

/** Raised when the person backs out of the camera or picker — not a failure. */
export class CaptureCancelled extends Error {}

/**
 * Raised when iOS refuses access rather than the user backing out.
 *
 * These two must stay apart. A cancellation is silent by design; a denial
 * needs to say what to do about it. Collapsing them means a tap that does
 * nothing at all, with no message and nothing in the log.
 */
export class CapturePermissionDenied extends Error {}

/** Backing out of the sheet. Deliberately does NOT match permission refusals. */
function wasCancelled(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return /cancel|abort|dismiss|no image (picked|selected)|closed/.test(msg);
}

function wasDenied(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return /denied|not authorized|unauthorized|permission|restricted|privacy/.test(msg);
}

/**
 * Downscale and re-encode before upload.
 *
 * A modern phone camera produces 3–5 MB per frame. Uploading that costs the
 * user's data and the project's storage quota for detail no one will ever look
 * at on a 390pt-wide screen — and if the photo is going to a vision model, the
 * long edge gets resized server-side anyway.
 */
async function downscale(source: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(source);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return source; // No 2D context: send the original rather than losing the photo.
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const out = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  return out ?? source;
}

/** Opens the system camera or picker and returns a downscaled JPEG. */
export async function capturePhoto(source: PhotoSource): Promise<CapturedPhoto> {
  const raw = isNative ? await captureNative(source) : await captureWeb(source);
  const blob = await downscale(raw);
  return { blob, previewUrl: URL.createObjectURL(blob) };
}

async function captureNative(source: PhotoSource): Promise<Blob> {
  const Camera = await cameraPlugin();
  const { CameraResultType, CameraSource } = await import("@capacitor/camera");

  // Ask explicitly rather than letting getPhoto trigger it. Requesting up
  // front means the first tap shows the system prompt and we can read the
  // answer, instead of getting an opaque throw that is hard to tell apart
  // from the user dismissing the picker.
  try {
    const want = source === "camera" ? "camera" : "photos";
    const status = await Camera.checkPermissions();
    const current = want === "camera" ? status.camera : status.photos;
    if (current === "prompt" || current === "prompt-with-rationale") {
      const asked = await Camera.requestPermissions({ permissions: [want] });
      const granted = want === "camera" ? asked.camera : asked.photos;
      if (granted !== "granted" && granted !== "limited") throw new CapturePermissionDenied();
    } else if (current === "denied") {
      throw new CapturePermissionDenied();
    }
  } catch (err) {
    if (err instanceof CapturePermissionDenied) throw err;
    // Some platforms do not implement checkPermissions. That is not a reason
    // to block the capture — fall through and let getPhoto decide.
  }

  try {
    const photo = await Camera.getPhoto({
      // A file URI rather than base64: base64 inflates the image by a third and
      // pushes the whole thing through the JS bridge as a string.
      resultType: CameraResultType.Uri,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      quality: 85,
      correctOrientation: true,
      allowEditing: false,
    });
    if (!photo.webPath) throw new Error("No image returned");
    const res = await fetch(photo.webPath);
    return await res.blob();
  } catch (err) {
    if (err instanceof CapturePermissionDenied) throw err;
    if (wasCancelled(err)) throw new CaptureCancelled();
    if (wasDenied(err)) throw new CapturePermissionDenied();
    throw err;
  }
}

/**
 * Web fallback. `capture="environment"` asks a phone browser for the rear
 * camera directly; on a desktop the same input is an ordinary file picker,
 * which is the sensible behaviour there.
 */
function captureWeb(source: PhotoSource): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.setAttribute("capture", "environment");
    input.style.display = "none";
    document.body.appendChild(input);

    // There is no cancel event on a file input. `focus` fires when the picker
    // closes either way, so a short delay after it with no file selected is the
    // only signal that the person backed out.
    let settled = false;
    const cleanup = () => {
      input.remove();
    };

    input.onchange = () => {
      settled = true;
      const file = input.files?.[0];
      cleanup();
      if (file) resolve(file);
      else reject(new CaptureCancelled());
    };

    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new CaptureCancelled());
        }, 600);
      },
      { once: true },
    );

    input.click();
  });
}

/**
 * Uploads to the private bucket under the owner's own folder.
 *
 * The folder name is the user id because that is what the storage policies
 * match on — see `0003_meal_photos.sql`. Returns the object path, which is what
 * gets stored on the meal row.
 */
export async function uploadMealPhoto(blob: Blob, userId: string, mealId: string): Promise<string> {
  if (!supabase) throw new Error("Supabase is not configured");
  const path = `${userId}/${mealId}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

/**
 * Signed URL for displaying a stored photo. The bucket is private, so there is
 * no permanent public URL to cache — each view mints a short-lived one.
 */
export async function mealPhotoUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Removes the stored object. Failing here is not worth surfacing to the user. */
export async function deleteMealPhoto(path: string): Promise<void> {
  if (!supabase) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
