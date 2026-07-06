/**
 * Web / Vercel build stub for @revenuecat/purchases-capacitor.
 * Native Capacitor builds set NATIVE_IAP_BUILD=true and use the real package.
 */
export const Purchases = {
  configure: async () => {},
  getOfferings: async () => ({ current: { availablePackages: [] } }),
  purchasePackage: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  restorePurchases: async () => ({ customerInfo: { entitlements: { active: {} } } }),
};

export default { Purchases };
