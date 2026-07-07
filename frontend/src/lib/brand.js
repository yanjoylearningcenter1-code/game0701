/** Product brand — JoyRecall (想記) under Yanjoy Learning Center. */
export const BRAND = {
  namespace: "yanjoy",
  productId: "joyrecall",
  nameEn: "JoyRecall",
  nameZh: "想記",
  parentEn: "Yanjoy Learning Center",
  parentZh: "欣想學習平台",
  bundleId: "com.yanjoy.joyrecall",
};

export function appDisplayName(lang) {
  return lang === "zh-HK" ? BRAND.nameZh : BRAND.nameEn;
}

export function brandTagline(lang) {
  if (lang === "zh-HK") {
    return `${BRAND.nameZh} · ${BRAND.parentZh}旗下學習 App`;
  }
  return `${BRAND.nameEn} · a ${BRAND.parentEn} app`;
}

export function shareAppName(lang) {
  return appDisplayName(lang);
}
