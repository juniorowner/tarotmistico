import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  reminder_hour: number;
};

/** Hora 0–23 no fuso; evita Number(format()) que vira NaN se o runtime devolver "01:59" ou "1:59 AM". */
function getHourInTimeZone(timeZone: string, date: Date): number {
  const tz = (timeZone || "America/Sao_Paulo").trim();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour");
  if (!hourPart) return -1;
  const h = parseInt(hourPart.value, 10);
  return Number.isFinite(h) ? h : -1;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const publicKey = Deno.env.get("WEB_PUSH_PUBLIC_KEY") ?? "";
  const privateKey = Deno.env.get("WEB_PUSH_PRIVATE_KEY") ?? "";
  const vapidSubject = Deno.env.get("WEB_PUSH_SUBJECT") ?? "mailto:suporte@tarotmistico.com";

  if (!supabaseUrl || !serviceKey || !publicKey || !privateKey) {
    return new Response(JSON.stringify({ error: "Push não configurado no servidor." }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails(vapidSubject, publicKey, privateKey);
  const admin = createClient(supabaseUrl, serviceKey);

  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, timezone, reminder_hour")
    .eq("active", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const subscriptions = (data ?? []) as PushSubscriptionRow[];
  let sent = 0;
  let deactivated = 0;
  let eligible = 0;

  const now = new Date();
  const hourNowSaoPaulo = getHourInTimeZone("America/Sao_Paulo", now);

  for (const sub of subscriptions) {
    const nowHour = getHourInTimeZone(sub.timezone, now);
    const targetHour = Number(sub.reminder_hour);
    if (!Number.isFinite(targetHour) || nowHour !== targetHour) continue;

    eligible += 1;

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: "Tarot Místico",
          body: "Sua leitura do dia está te esperando. Tire suas cartas agora.",
          url: "/",
        })
      );
      sent += 1;
    } catch (err) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").update({ active: false }).eq("id", sub.id);
        deactivated += 1;
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      sent,
      deactivated,
      active_subscriptions: subscriptions.length,
      hour_now_sao_paulo: hourNowSaoPaulo,
      eligible_after_hour_filter: eligible,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
