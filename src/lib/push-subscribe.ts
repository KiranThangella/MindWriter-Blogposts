// src/lib/push-subscribe.ts
//
// Browser-side half of the push notification feature (see the worker's
// src/lib/push-notifications.ts + src/routes/push.ts for the send side).

import { safeFetchJson } from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Current subscription state, checked against the actual browser API
 * (not just a localStorage flag) — so it stays accurate if the person
 * revokes notification permission from browser settings directly. */
export async function getPushSubscriptionStatus(): Promise<"subscribed" | "unsubscribed" | "denied" | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    return existing ? "subscribed" : "unsubscribed";
  } catch {
    return "unsubscribed";
  }
}

export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: false, error: "Push notifications not supported in this browser." };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: "Notification permission not granted." };
    }

    const { publicKey } = await safeFetchJson("/api/push/vapid-public-key");
    if (!publicKey) return { success: false, error: "Push notifications aren't configured on the server yet." };

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    await safeFetchJson("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to subscribe." };
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: false };
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { success: true };

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await safeFetchJson("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to unsubscribe." };
  }
}
