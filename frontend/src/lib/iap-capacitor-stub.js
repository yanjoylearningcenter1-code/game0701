/** Web/staging stub — real SDK used only in Capacitor native builds (NATIVE_IAP_BUILD=true). */
export const Purchases = {
  configure: async () => {},
  getOfferings: async () => ({ current: { availablePackages: [] } }),
  purchasePackage: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  restorePurchases: async () => ({ customerInfo: { entitlements: { active: {} } } }),
};
