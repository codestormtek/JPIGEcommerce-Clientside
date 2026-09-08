import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.replit.jpigecommerce.kiosk",
  appName: "Jiggling Pig Kiosk",
  webDir: "www",
  server: {
    allowNavigation: ["jpig-ecommerce-clientside.replit.app"],
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#17100c",
  },
};

export default config;