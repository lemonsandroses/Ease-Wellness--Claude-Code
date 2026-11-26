import { useEffect, useState } from "react";
import { mealPhotoUrl } from "@/lib/mealPhoto";
import { getPhoto } from "@/lib/photoStore";

/**
 * Thumbnail for a meal photo, from whichever of the two places holds it.
 *
 * An uploaded photo lives in a private bucket, so there is no durable URL to
 * put in `src` — each mount mints a signed one. A photo taken without an
 * account has not been uploaded yet and sits in IndexedDB instead; it is shown
 * from there until a session exists and it syncs.
 *
 * Renders nothing when neither has it, so a missing image never leaves a
 * broken frame in a list.
 */
export default function MealThumb({ path, mealId, alt }: { path?: string; mealId: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    // Object URLs must be revoked on cleanup; signed URLs must not be. Track
    // which kind this is rather than revoking whatever is in state.
    let objectUrl: string | null = null;

    void (async () => {
      if (path) {
        const signed = await mealPhotoUrl(path);
        if (!live) return;
        if (signed) {
          setUrl(signed);
          return;
        }
        // Signing failed — fall through to the local copy, which is still
        // there whenever an upload has not been confirmed.
      }
      const blob = await getPhoto(mealId);
      if (!live) return;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } else {
        setUrl(null);
      }
    })();

    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, mealId]);

  if (!url) return null;

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="h-11 w-11 shrink-0 rounded-xl border border-veil object-cover"
    />
  );
}
