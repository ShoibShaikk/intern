// money.js: show, read, split and tax rupee amounts.
// Part of rupee-kit. SPEC.md says exactly what each function must do.

// Rounds a rupee amount to whole paise (2 decimals).
const roundPaise = (amount) => Math.round(amount * 100) / 100;

// "1234567" → "12,34,567": the last 3 digits, then groups of 2.
function groupIndian(digits) {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const pairs = rest.replace(/\d(?=(?:\d{2})+$)/g, "$&,");
  return `${pairs},${lastThree}`;
}

/** 150000 → "₹1,50,000.00". Anything that isn't a finite number → "". */
export function formatINR(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "";
  const sign = amount < 0 ? "-" : "";
  const totalPaise = Math.floor(Math.abs(amount) * 100 + 0.5 + 1e-9);
  const rupees = String(Math.floor(totalPaise / 100));
  const paise = String(totalPaise % 100).padStart(2, "0");
  return `${sign}₹${groupIndian(rupees)}.${paise}`;
}

/** "₹1,20,000", "Rs. 500", "1.5 lakh", "2 crore" → a number of rupees. Not understood → null. */
export function parseINR(text) {
  if (typeof text === "number") return Number.isFinite(text) && text >= 0 ? roundPaise(text) : null;
  if (typeof text !== "string") return null;
  let value = text.trim().toLowerCase();
  value = value.replace(/^(₹|rs\.?|inr)\s*/, "");
  value = value.replaceAll(",", "");
  const match = value.match(/^(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr)?$/);
  if (!match) return null;
  const [, number, unit] = match;
  const multiplier = !unit ? 1 : unit.startsWith("l") ? 100000 : 10000000;
  return roundPaise(Number(number) * multiplier);
}

/** Splits a bill between `people` friends. The shares must add up to the total exactly. */
export function splitAmount(total, people) {
  if (!Number.isInteger(people) || people < 1) {
    throw new RangeError("people must be a whole number, 1 or more");
  }
  const totalPaise = Math.round(total * 100);
  const basePaise = Math.trunc(totalPaise / people);
  const remainder = totalPaise % people;
  const extraStep = remainder > 0 ? 1 : remainder < 0 ? -1 : 0;
  const extraCount = Math.abs(remainder);

  return Array.from({ length: people }, (_, idx) => {
    const paise = basePaise + (idx < extraCount ? extraStep : 0);
    return paise / 100;
  });
}

/** A price that already includes GST → { base, gst }. base + gst must equal the price. */
/** A price that already includes GST → { base, gst }. base + gst must equal the price. */
/** A price that already includes GST → { base, gst }. base + gst must equal the price. */
export function gstFromInclusive(price, ratePercent) {
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    throw new RangeError("ratePercent must be between 0 and 100");
  }
  const base = roundPaise((price * 100) / (100 + ratePercent));
  const gst = roundPaise(price - base);
  return { base, gst };
}
