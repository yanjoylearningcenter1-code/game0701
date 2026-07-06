/**
 * In-app purchases via RevenueCat (Capacitor native) with web fallback.
 * Configure REVENUECAT_API_KEY_* on backend / App Store Connect product IDs.
 */
import { Capacitor } from "@capacitor/core";
import api from "@/lib/api";

let configured = false;

async function loadPurchases() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import("@revenuecat/purchases-capacitor");
    return mod.Purchases;
  } catch {
    return null;
  }
}

export async function initIap(appUserId) {
  const Purchases = await loadPurchases();
  if (!Purchases) return { native: false };
  const cfg = await api.get("/iap/config");
  const key = Capacitor.getPlatform() === "ios"
    ? cfg.data?.revenuecat_api_key_ios
    : cfg.data?.revenuecat_api_key_android;
  if (!key) return { native: true, configured: false };
  await Purchases.configure({ apiKey: key, appUserID: appUserId });
  configured = true;
  return { native: true, configured: true };
}

export async function purchasePremium(kidOwnerId) {
  const Purchases = await loadPurchases();
  if (!Purchases || !configured) {
    return { ok: false, reason: "iap_unavailable" };
  }
  const cfg = await api.get("/iap/config");
  const productId = cfg.data?.products?.premium_monthly;
  const offerings = await Purchases.getOfferings();
  const pkg = offerings?.current?.availablePackages?.find(
    (p) => p.product?.identifier === productId
  ) || offerings?.current?.availablePackages?.[0];
  if (!pkg) return { ok: false, reason: "no_package" };
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  const active = customerInfo?.entitlements?.active?.premium != null;
  await api.post("/iap/sync", {
    kid_owner_id: kidOwnerId,
    entitlements: { premium: { active } },
  });
  return { ok: active, subscription_tier: active ? "premium" : "free" };
}

export async function purchaseTeacherPlan(plan) {
  const Purchases = await loadPurchases();
  if (!Purchases || !configured) return { ok: false, reason: "iap_unavailable" };
  const cfg = await api.get("/iap/config");
  const productId = plan === "school"
    ? cfg.data?.products?.teacher_school
    : cfg.data?.products?.teacher_classroom;
  const offerings = await Purchases.getOfferings();
  const pkg = offerings?.current?.availablePackages?.find(
    (p) => p.product?.identifier === productId
  );
  if (!pkg) return { ok: false, reason: "no_package" };
  await Purchases.purchasePackage({ aPackage: pkg });
  await api.post("/iap/sync", { teacher_id: true, entitlements: { [plan]: { active: true } } });
  return { ok: true, plan };
}

export async function restorePurchases(kidOwnerId) {
  const Purchases = await loadPurchases();
  if (!Purchases || !configured) return { ok: false };
  const { customerInfo } = await Purchases.restorePurchases();
  const active = customerInfo?.entitlements?.active?.premium != null;
  await api.post("/iap/sync", {
    kid_owner_id: kidOwnerId,
    entitlements: { premium: { active } },
  });
  return { ok: active };
}

export function isNativeIapAvailable() {
  return Capacitor.isNativePlatform();
}
