import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";

const NATIVE_REMINDER_KEY = "daily_reminder_enabled";
const NATIVE_REMINDER_NOTIFICATION_ID = 9001;

function isNativeRuntime(): boolean {
  return Capacitor.isNativePlatform();
}

function base64ToUint8Array(base64: string) {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const raw = atob(padded);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function enableDailyPush(reminderHour = 9) {
  if (isNativeRuntime()) {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") {
      throw new Error("Permissão de notificação não concedida no dispositivo.");
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NATIVE_REMINDER_NOTIFICATION_ID,
          title: "Tarot Místico",
          body: "Sua leitura do dia está te esperando.",
          schedule: {
            on: {
              hour: reminderHour,
              minute: 0,
            },
            repeats: true,
          },
        },
      ],
    });

    await Preferences.set({
      key: NATIVE_REMINDER_KEY,
      value: "1",
    });
    return;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Seu navegador não suporta notificações push.");
  }

  const vapidPublicKey = (import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY ?? "").trim();
  if (!vapidPublicKey) {
    throw new Error("VITE_WEB_PUSH_PUBLIC_KEY não configurada.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissão de notificação não concedida.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Faça login para ativar lembrete diário.");

  const registration = await navigator.serviceWorker.register("/sw.js");
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    throw new Error("Não foi possível ler os dados da inscrição push.");
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      timezone: tz,
      reminder_hour: reminderHour,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

export async function disableDailyPush() {
  if (isNativeRuntime()) {
    await LocalNotifications.cancel({
      notifications: [{ id: NATIVE_REMINDER_NOTIFICATION_ID }],
    });
    await Preferences.set({
      key: NATIVE_REMINDER_KEY,
      value: "0",
    });
    return;
  }

  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  const endpoint = subscription?.endpoint;

  if (subscription) {
    await subscription.unsubscribe();
  }

  if (endpoint) {
    await supabase
      .from("push_subscriptions")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("endpoint", endpoint);
  }
}

export async function isDailyPushEnabled(): Promise<boolean> {
  if (isNativeRuntime()) {
    const { value } = await Preferences.get({ key: NATIVE_REMINDER_KEY });
    return value === "1";
  }
  if (!("Notification" in window)) return false;
  return Notification.permission === "granted";
}
