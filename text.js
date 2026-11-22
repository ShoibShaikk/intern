// text.js: make links from titles, and shorten long text.
// Part of rupee-kit. SPEC.md says exactly what each function must do.

/** "Café Délhi & Co." → "cafe-delhi-and-co". Nothing usable left → "untitled". */
export function slugify(title) {
  const slug = String(title ?? "")
    .normalize("NFD")
  .replace(/-+/g, "-") // drop accents: é → e
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
  return slug || "untitled";
}

/** Shortens text to at most `max` characters, ending with "…" when it was cut. */
export function truncate(text, max) {
  const value = String(text ?? "");
  if (value.length <= max) return value;
  return value.slice(0, max) + "…";
}
