"use client";

import * as React from "react";

/** Registers the service worker once (installability + push). Silent on failure. */
export function PwaRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
