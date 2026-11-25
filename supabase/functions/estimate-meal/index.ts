/**
 * estimate-meal — vision estimation of a meal's macros.
 *
 * Deploy:
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *   supabase functions deploy estimate-meal
 *
 * The key lives only here. It is never shipped to the app, because anything in
 * a client bundle can be read out of it by anyone who installs the app.
 */

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const MODEL = "claude-sonnet-5-5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** 8 MB of base64 is roughly 6 MB of image — past anything the client sends. */
const MAX_BASE64 = 8 * 1024 * 1024;

const SYSTEM = `You estimate the nutritional content of a meal from a photograph.

Reply with a single JSON object and nothing else. No prose, no code fence.

{
  "name": short dish name, 2-5 words,
  "calories": integer kcal for the portion shown,
  "protein": grams, one decimal,
  "carbs": grams, one decimal,
  "fats": grams, one decimal,
  "fibre": grams, one decimal,
  "nutrients": up to 4 notable micronutrients as short strings,
  "confidence": 0 to 1, how sure you are
}

Rules:
- Estimate the portion actually visible, not a standard serving.
- Use the plate, cutlery or hand in frame for scale where available.
- If the photo does not show food, set confidence to 0 and all numbers to 0.
- Lower your confidence when the dish is ambiguous, partly hidden, or the
  portion is hard to judge. An honest low number is more useful than a
  confident wrong one.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY is not set on this project" }, 503);
  }

  // Require a signed-in caller. Without this the endpoint is an open vision
  // API billed to this project for anyone who learns the URL.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Not signed in" }, 401);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: SUPABASE_ANON_KEY },
  });
  if (!userRes.ok) return json({ error: "Not signed in" }, 401);

  let image: string;
  let mimeType: string;
  try {
    const body = await req.json();
    image = typeof body.image === "string" ? body.image : "";
    mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
  } catch {
    return json({ error: "Malformed request body" }, 400);
  }

  if (!image) return json({ error: "No image supplied" }, 400);
  if (image.length > MAX_BASE64) return json({ error: "Image too large" }, 413);
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    return json({ error: "Unsupported image type" }, 415);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: image } },
            { type: "text", text: "Estimate this meal." },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("anthropic error", res.status, detail);
    // The upstream body can carry account details, so it is logged rather than
    // returned to the app.
    return json({ error: "Estimation service failed" }, 502);
  }

  const payload = await res.json();
  const text: string = payload?.content?.[0]?.text ?? "";

  // The model is asked for bare JSON, but a stray code fence or a leading
  // sentence would otherwise throw here. Take the outermost braces.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    console.error("unparseable model reply", text.slice(0, 400));
    return json({ error: "Could not read the estimate" }, 502);
  }

  try {
    return json(JSON.parse(text.slice(start, end + 1)));
  } catch {
    console.error("invalid JSON from model", text.slice(0, 400));
    return json({ error: "Could not read the estimate" }, 502);
  }
});
