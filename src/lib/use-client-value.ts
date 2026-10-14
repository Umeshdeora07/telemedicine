"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Read a browser-only value (cookie, user agent, feature support) without an
 * effect: the server render uses `server`, the client uses `get()`, and React
 * reconciles them without a hydration mismatch. `get` must return a primitive.
 */
export function useClientValue<T extends string | number | boolean | null>(get: () => T, server: T): T {
  return useSyncExternalStore(noSubscribe, get, () => server);
}
