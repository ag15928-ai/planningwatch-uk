import { createClient } from "npm:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const EARTH_MILES = 3958.7613;
const milesBetween = (a: {lat:number;lng:number}, b: {lat:number;lng:number}) => {
  const rad = (n:number) => n * Math.PI / 180;
  const dLat = rad(b.lat-a.lat), dLng = rad(b.lng-a.lng);
  const x = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(x));
};
const fingerprint = (d: Record<string, unknown>) => {
  const s = [d.id,d.name,d.kind,d.status,d.updated,d.applicationRef,d.capacity,d.place,d.country,d.authority,d.lat,d.lng,d.sourceUrl,d.pipeline].map(v => v == null ? "" : String(v)).join("\u001f");
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i=0;i<s.length;i++) { const c=s.charCodeAt(i); a=Math.imul(a^c,0x01000193); b=Math.imul(b^c,0x85ebca6b); }
  return (a>>>0).toString(16).padStart(8,"0")+(b>>>0).toString(16).padStart(8,"0");
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST required", {status:405});
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || req.headers.get("Authorization") !== `Bearer ${expected}`) return new Response("Unauthorized", {status:401});
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const feedUrl = Deno.env.get("REPD_FEED_URL")!;
    const vapidKeysJson = Deno.env.get("VAPID_KEYS_JSON")!;
    const admin = createClient(url, key, {auth:{persistSession:false}});
    const res = await fetch(feedUrl, {headers:{"cache-control":"no-cache"}});
    if (!res.ok) throw new Error(`Dataset fetch returned ${res.status}`);
    const feed = await res.json();
    const records = (Array.isArray(feed.projects) ? feed.projects : []).filter((d: Record<string, unknown>) => (d.kind === "solar" || d.kind === "wind") && Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lng)) && d.pipeline);
    if (!records.length) throw new Error("Dataset was empty; refusing to alter the baseline");

    const previous: Record<string, any> = {};
    for (let offset=0; ; offset+=1000) {
      const {data,error} = await admin.from("renewable_state").select("id,fingerprint,kind,lat,lng,name").range(offset,offset+999);
      if (error) throw error;
      for (const row of data || []) previous[row.id]=row;
      if (!data || data.length<1000) break;
    }
    const baseline = Object.keys(previous).length > 0;
    const changed = records.filter((d: Record<string, unknown>) => !previous[String(d.id)] || previous[String(d.id)].fingerprint !== fingerprint(d));
    if (baseline && changed.length) {
      const {data:watchers,error} = await admin.from("alert_watchers").select("user_id,centre_lat,centre_lng,radius_miles,kinds,notification_frequency,last_notified_at,push_subscription").eq("active",true);
      if (error) throw error;
      const vapidKeys = await webpush.importVapidKeys(JSON.parse(vapidKeysJson));
      const contactInformation = Deno.env.get("VAPID_SUBJECT");
      if (!contactInformation || !contactInformation.startsWith("mailto:")) throw new Error("VAPID_SUBJECT must be set to a support email");
      const pushServer = await webpush.ApplicationServer.new({contactInformation,vapidKeys});
      for (const watcher of watchers || []) {
        const nearby = changed.filter((d: Record<string, unknown>) => watcher.kinds.includes(d.kind) && milesBetween({lat:watcher.centre_lat,lng:watcher.centre_lng},{lat:Number(d.lat),lng:Number(d.lng)}) <= watcher.radius_miles);
        if (!nearby.length) continue;
        const noticeGap = watcher.notification_frequency === "weekly" ? 7*86400000 : watcher.notification_frequency === "daily" ? 86400000 : 0;
        if (watcher.last_notified_at && Date.now()-new Date(watcher.last_notified_at).getTime() < noticeGap) continue;
        const solar = nearby.filter((d: Record<string, unknown>)=>d.kind==="solar").length;
        const wind = nearby.filter((d: Record<string, unknown>)=>d.kind==="wind").length;
        const parts = [solar?`${solar} solar`:"",wind?`${wind} wind`:""].filter(Boolean).join(" and ");
        const payload = JSON.stringify({title:"PlanningWatch UK update",body:`${parts} project change${nearby.length===1?"":"s"} detected within ${watcher.radius_miles} miles of your saved centre. Open the app to review the dataset and sources.`,url:"https://ag15928-ai.github.io/planningwatch-uk/#alerts"});
        try { await pushServer.subscribe(watcher.push_subscription).pushTextMessage(payload,{ttl:86400}); await admin.from("alert_watchers").update({last_notified_at:new Date().toISOString()}).eq("user_id",watcher.user_id); }
        catch (error) {
          if (error instanceof webpush.PushMessageError && error.isGone()) await admin.from("alert_watchers").delete().eq("user_id",watcher.user_id);
          else console.error("Push delivery failed", watcher.user_id, error);
        }
      }
    }
    const rows = records.map((d: Record<string, unknown>) => ({id:String(d.id),fingerprint:fingerprint(d),kind:d.kind,lat:Number(d.lat),lng:Number(d.lng),name:String(d.name||"Renewable project"),status:d.status?String(d.status):null,capacity:d.capacity?String(d.capacity):null,place:d.place?String(d.place):null,country:d.country?String(d.country):null,source_url:d.sourceUrl?String(d.sourceUrl):feed.sourceUrl||null,updated_at:new Date().toISOString()}));
    for (let i=0;i<rows.length;i+=500) { const {error}=await admin.from("renewable_state").upsert(rows.slice(i,i+500)); if(error) throw error; }
    return Response.json({ok:true,baseline:!baseline,checked:records.length,changes:baseline?changed.length:0,snapshot:feed.snapshot||null});
  } catch (error) {
    console.error("check-renewables failed",error);
    return Response.json({error:"Renewable check failed"},{status:500});
  }
});
