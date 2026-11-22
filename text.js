// text.js: make links from titles, and shorten long text.
// Part of rupee-kit. SPEC.md says exactly what each function must do.

const COMBINING_MARKS_RE = new RegExp("[\\u0300-\\u036f\\u1ab0-\\u1aff\\u1dc0-\\u1dff\\u20d0-\\u20ff]", "g");
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function toGraphemes(str) {
  return Array.from(graphemeSegmenter.segment(str), (s) => s.segment);
}

/** "Café Délhi & Co." → "cafe-delhi-and-co". Nothing usable left → "untitled". */
export function slugify(title) {
  const slug = String(title ?? "")
    .normalize("NFD")
    .replace(COMBINING_MARKS_RE, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
  return slug || "untitled";
}

/** Shortens text to at most `max` characters, ending with "…" when it was cut. */
export function truncate(text, max) {
  if (typeof max !== "number" || !Number.isInteger(max) || max < 0) {
    throw new RangeError("max must be a non-negative integer");
  }
  const value = String(text ?? "");
  const graphemes = toGraphemes(value);
  if (graphemes.length <= max) return value;
  if (max === 0) return "";
  return graphemes.slice(0, max - 1).join("") + "\u2026";
}