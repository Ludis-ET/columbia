/**
 * Reader preferences, persisted per visitor in localStorage and applied as
 * attributes on <html>.
 *
 * For an audience that is mostly older adults, text size and contrast are
 * usability features rather than compliance checkboxes — so they get the same
 * treatment as the theme: applied before first paint, no flash, no layout jump.
 */

export const PREFERENCES = {
  theme: { attr: "data-theme", values: ["light", "dark"] },
  textSize: { attr: "data-text-size", values: ["large", "largest"] },
  contrast: { attr: "data-contrast", values: ["high"] },
  motion: { attr: "data-motion", values: ["reduce"] },
  readingFont: { attr: "data-reading-font", values: ["hyperlegible"] },
} as const;

export type PreferenceKey = keyof typeof PREFERENCES;

/** The default for every preference is "unset", which stamps no attribute. */
export type PreferenceValue = string | null;

export const STORAGE_PREFIX = "cc:";

export function storageKey(key: PreferenceKey): string {
  return `${STORAGE_PREFIX}${key}`;
}

/** Reads a stored preference, tolerating blocked or unavailable storage. */
export function readPreference(key: PreferenceKey): PreferenceValue {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    return (PREFERENCES[key].values as readonly string[]).includes(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Applies a preference to the document and persists it. */
export function writePreference(key: PreferenceKey, value: PreferenceValue): void {
  const { attr } = PREFERENCES[key];
  const root = document.documentElement;

  if (value === null) root.removeAttribute(attr);
  else root.setAttribute(attr, value);

  try {
    if (value === null) localStorage.removeItem(storageKey(key));
    else localStorage.setItem(storageKey(key), value);
  } catch {
    // Private browsing or blocked site data. The choice still applies to this
    // page view; it just will not survive a reload.
  }
}

/**
 * Applies every stored preference before first paint.
 *
 * Inlined into <head>, so it must stay small and dependency-free. Kept in sync
 * with PREFERENCES above by hand — it cannot import at parse time.
 */
export const preferencesScript = `(function(){try{var m={theme:"data-theme",textSize:"data-text-size",contrast:"data-contrast",motion:"data-motion",readingFont:"data-reading-font"},e=document.documentElement;for(var k in m){var v=localStorage.getItem("${STORAGE_PREFIX}"+k);if(v)e.setAttribute(m[k],v)}}catch(e){}})();`;
