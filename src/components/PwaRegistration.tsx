"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    const productionHost =
      window.location.hostname === "akibusiness.com" ||
      window.location.hostname === "www.akibusiness.com" ||
      window.location.hostname === "business.akipasa.com" ||
      window.location.hostname === "akiduermo.akipasa.com" ||
      window.location.hostname === "akiconduzco.akipasa.com";
    if ("serviceWorker" in navigator && productionHost)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
