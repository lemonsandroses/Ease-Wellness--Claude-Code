import { useEffect, useState } from "react";
import { mealPhotoUrl } from "@/lib/mealPhoto";

/**
 * Thumbnail for a stored meal photo.
 *
 * The bucket is private, so there is no durable URL to put in `src` — each
 * mount mints a signed one. Renders nothing at all when there is no photo or
 * the signing fails, so a missing image never leaves a broken frame in a list.
 */
export default function MealThumb({ path, alt }: { path?: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let live = true;
    void mealPhotoUrl(path).then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [path]);

  if (!path || !url) return null;

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="h-11 w-11 shrink-0 rounded-xl border border-veil object-cover"
    />
  );
}
