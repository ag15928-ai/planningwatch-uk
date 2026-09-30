import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://ag15928-ai.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "POST required" }, 405);
  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return reply({ error: "Sign-in required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) return reply({ error: "Invalid session" }, 401);
    const body = await req.json();
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    if (body.active === false) {
      const { error } = await admin.from("alert_watchers").delete().eq("user_id", user.id);
      if (error) throw error;
      return reply({ ok: true, active: false });
    }
    const lat = Number(body.lat), lng = Number(body.lng), radius = Number(body.radius);
    const kinds = Array.isArray(body.kinds) ? [...new Set(body.kinds.filter((k: unknown) => k === "solar" || k === "wind"))] : [];
    const sub = body.subscription;
    const frequency = ["immediate","daily","weekly"].includes(body.frequency) ? body.frequency : "immediate";
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || !Number.isInteger(radius) || radius < 1 || radius > 100 || !kinds.length || !sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return reply({ error: "Invalid watch settings" }, 400);
    if (!String(sub.endpoint).startsWith("https://")) return reply({ error: "Invalid push endpoint" }, 400);
    const { error } = await admin.from("alert_watchers").upsert({ user_id: user.id, centre_lat: lat, centre_lng: lng, radius_miles: radius, kinds, notification_frequency:frequency, push_subscription: sub, active: true, updated_at: new Date().toISOString() });
    if (error) throw error;
    return reply({ ok: true, active: true });
  } catch (error) {
    console.error("register-watch failed", error);
    return reply({ error: "Could not save background alert settings" }, 500);
  }
});
