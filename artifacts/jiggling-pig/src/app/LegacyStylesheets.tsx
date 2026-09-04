"use client";

import { useInsertionEffect } from "react";

const stylesheets = [
  ["bootstrap", "/assets/css/bootstrap.min.css"],
  ["plugins", "/assets/css/plugins.css"],
  ["theme", "/assets/css/style.css"],
] as const;

export default function LegacyStylesheets() {
  useInsertionEffect(() => {
    for (const [id, href] of stylesheets) {
      if (document.head.querySelector(`link[data-jiggling-pig-style="${id}"]`)) {
        continue;
      }

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.jigglingPigStyle = id;
      document.head.appendChild(link);
    }
  }, []);

  return null;
}