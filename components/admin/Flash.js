"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { cx } from "./ui";

const FlashContext = createContext(() => {});

const tones = {
  success: "border-leaf-200 bg-leaf-50 text-leaf-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-navy-200 bg-white text-navy-900",
};

/**
 * Dashboard-wide notifications. Lives in the dashboard layout, so messages
 * survive the router.refresh() that follows a successful action, even when
 * the button that triggered it is replaced (for example Publish → Unpublish).
 */
export function FlashProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((list) => list.filter((i) => i.id !== id)), []);
  const push = useCallback(
    (tone, text) => {
      if (!text) return;
      const id = `${Date.now()}-${Math.random()}`;
      setItems((list) => [...list.slice(-2), { id, tone, text }]);
      if (tone !== "error") setTimeout(() => dismiss(id), 8000);
    },
    [dismiss]
  );

  return (
    <FlashContext value={push}>
      {children}
      <div className="fixed right-4 bottom-4 z-[70] w-[min(28rem,calc(100vw-2rem))] space-y-2" aria-live="polite">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className={cx("flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm shadow-lg", tones[item.tone] || tones.info)}
          >
            <p>{item.text}</p>
            <button type="button" onClick={() => dismiss(item.id)} className="shrink-0 text-xs font-semibold underline">
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </FlashContext>
  );
}

/** Returns flash(tone, text). */
export function useFlash() {
  return useContext(FlashContext);
}
