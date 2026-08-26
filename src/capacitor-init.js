// ── Capacitor native hooks ────────────────────────────────────
// Only active when running inside the Android/iOS wrapper.
// Safe no-op in the browser.

import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { App as CapApp } from "@capacitor/app";
import { t } from "./i18n";

export function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return;

  // Status bar — dark navy matching app header
  try {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: "#0D1B2A" });
    StatusBar.setOverlaysWebView({ overlay: false });
  } catch (_) {}

  // Hide splash once React is mounted
  setTimeout(() => {
    try { SplashScreen.hide(); } catch (_) {}
  }, 300);

  // Android hardware back-button:
  //  - if there's browser history → go back
  //  - if at root → confirm & exit
  CapApp.addListener("backButton", async ({ canGoBack }) => {
    if (canGoBack || window.history.length > 1) {
      window.history.back();
    } else {
      if (await window.confirmAsync(t("capacitor_init.exit_sanchalan"))) {
        CapApp.exitApp();
      }
    }
  });
}
