// The tests for rupee-kit. Run them with: npm test   (or: node --test)
// SPEC.md is the single source of truth.

import assert from "node:assert/strict";
import test from "node:test";
import { formatINR, formatINRShort, gstFromInclusive, parseINR, splitAmount } from "./money.js";
import { daysLeft, formatDateIN } from "./dates.js";
import { slugify, truncate } from "./text.js";

test("formatINR: small amounts", () => {
  assert.equal(formatINR(0), "₹0.00");
  assert.equal(formatINR(999), "₹999.00");
  assert.equal(formatINR(1234.5), "₹1,234.50");
});

test("formatINR: lakhs and crores use Indian grouping", () => {
  assert.equal(formatINR(100000), "₹1,00,000.00");
  assert.equal(formatINR(150000), "₹1,50,000.00");
  assert.equal(formatINR(1234567), "₹12,34,567.00");
  assert.equal(formatINR(25000000), "₹2,50,00,000.00");
});

test("formatINR: paise round half up", () => {
  assert.equal(formatINR(1.005), "₹1.01");
  assert.equal(formatINR(2.675), "₹2.68");
  assert.equal(formatINR(0.125), "₹0.13");
  assert.equal(formatINR(1.004), "₹1.00");
});

test("formatINR: negative amounts and junk", () => {
  assert.equal(formatINR(-2500), "-₹2,500.00");
  assert.equal(formatINR(-0), "₹0.00");
  assert.equal(formatINR(NaN), "");
  assert.equal(formatINR(Infinity), "");
  assert.equal(formatINR(-Infinity), "");
  assert.equal(formatINR("500"), "");
  assert.equal(formatINR(null), "");
  assert.equal(formatINR(undefined), "");
  assert.equal(formatINR({}), "");
});

test("formatINRShort: compact amounts with lakh and crore (bonus)", () => {
  assert.equal(formatINRShort(150000), "₹1.5 lakh");
  assert.equal(formatINRShort(100000), "₹1 lakh");
  assert.equal(formatINRShort(10000000), "₹1 crore");
  assert.equal(formatINRShort(25000000), "₹2.5 crore");
  assert.equal(formatINRShort(-150000), "-₹1.5 lakh");
  assert.equal(formatINRShort(999), "₹999.00");
  assert.equal(formatINRShort(0), "₹0.00");
  assert.equal(formatINRShort(NaN), "");
  assert.equal(formatINRShort(null), "");
  assert.equal(formatINRShort("150000"), "");
});

test("parseINR: prices people type", () => {
  assert.equal(parseINR("₹12,000"), 12000);
  assert.equal(parseINR("1.5 lakh"), 150000);
  assert.equal(parseINR("1.5 lac"), 150000);
  assert.equal(parseINR("1.5 lakhs"), 150000);
  assert.equal(parseINR("1.5 lacs"), 150000);
  assert.equal(parseINR("2 crore"), 20000000);
  assert.equal(parseINR("2 crores"), 20000000);
  assert.equal(parseINR("2 cr"), 20000000);
  assert.equal(parseINR("Rs. 1,20,000"), 120000);
  assert.equal(parseINR("Rs 500"), 500);
  assert.equal(parseINR("INR 500"), 500);
  assert.equal(parseINR("₹ 500"), 500);
  assert.equal(parseINR("120000"), 120000);
  assert.equal(parseINR(120000), 120000);
  assert.equal(parseINR(0), 0);
  assert.equal(parseINR("0"), 0);
});

test("parseINR: Western and Indian comma grouping", () => {
  assert.equal(parseINR("1,20,000"), 120000);
  assert.equal(parseINR("120,000"), 120000);
  assert.equal(parseINR("1,20,00,000"), 12000000);
  assert.equal(parseINR("12,000,000"), 12000000);
});

test("parseINR: things it must refuse", () => {
  assert.equal(parseINR("15k"), null);
  assert.equal(parseINR(""), null);
  assert.equal(parseINR("   "), null);
  assert.equal(parseINR("-500"), null);
  assert.equal(parseINR("₹ -500"), null);
  assert.equal(parseINR(-500), null);
  assert.equal(parseINR(null), null);
  assert.equal(parseINR(undefined), null);
  assert.equal(parseINR(NaN), null);
  assert.equal(parseINR("two words"), null);
  assert.equal(parseINR("10 20"), null);
});

test("splitAmount: an even split and remainder paise", () => {
  assert.deepEqual(splitAmount(300, 3), [100, 100, 100]);
  assert.deepEqual(splitAmount(100, 3), [33.34, 33.33, 33.33]);
  assert.deepEqual(splitAmount(10, 4), [2.5, 2.5, 2.5, 2.5]);
  assert.deepEqual(splitAmount(0, 2), [0, 0]);
  assert.throws(() => splitAmount(300, 0), RangeError);
  assert.throws(() => splitAmount(300, -1), RangeError);
  assert.throws(() => splitAmount(300, 2.5), RangeError);
  assert.throws(() => splitAmount(300, "3"), RangeError);
});

test("splitAmount: 1,000 randomized deterministic test cases (bonus)", () => {
  // LCG pseudo-random generator with fixed seed for repeatability
  let seed = 123456789;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 1000; i++) {
    const total = Math.round((rand() * 100000 + 0.01) * 100) / 100;
    const people = Math.floor(rand() * 50) + 1;
    const shares = splitAmount(total, people);

    assert.equal(shares.length, people);
    const sumPaise = shares.reduce((acc, val) => acc + Math.round(val * 100), 0);
    const totalPaise = Math.round(total * 100);
    assert.equal(sumPaise, totalPaise);

    // Leftover paise must go to the first people (shares must be non-increasing)
    for (let j = 0; j < shares.length - 1; j++) {
      assert(shares[j] >= shares[j + 1]);
      assert(Math.round((shares[j] - shares[j + 1]) * 100) <= 1);
    }
  }
});

test("gstFromInclusive: zero and non-zero GST", () => {
  assert.deepEqual(gstFromInclusive(500, 0), { base: 500, gst: 0 });
  assert.deepEqual(gstFromInclusive(1180, 18), { base: 1000, gst: 180 });
  assert.deepEqual(gstFromInclusive(100, 100), { base: 50, gst: 50 });

  const calculated = gstFromInclusive(150, 12);
  assert.equal(Math.round((calculated.base + calculated.gst) * 100) / 100, 150);

  assert.throws(() => gstFromInclusive(500, -1), RangeError);
  assert.throws(() => gstFromInclusive(500, 101), RangeError);
  assert.throws(() => gstFromInclusive(500, NaN), RangeError);
  assert.throws(() => gstFromInclusive(500, "18"), RangeError);
});

test("formatDateIN and daysLeft", () => {
  assert.equal(formatDateIN("2026-11-01T06:30:00Z"), "1 Nov 2026");
  assert.equal(formatDateIN("2026-10-31T20:00:00Z"), "1 Nov 2026");
  assert.equal(formatDateIN(new Date("2026-11-04T00:00:00+05:30")), "4 Nov 2026");
  assert.equal(formatDateIN(1793514600000), "1 Nov 2026");
  assert.equal(formatDateIN("not a date"), "");
  assert.equal(formatDateIN(""), "");
  assert.equal(formatDateIN(null), "");
  assert.equal(formatDateIN(undefined), "");

  assert.equal(daysLeft("2026-11-05", new Date("2026-11-03T12:00:00+05:30")), 2);
  assert.equal(daysLeft("2026-11-03", new Date("2026-11-03T12:00:00+05:30")), 0);
  assert.equal(daysLeft("2026-11-01", new Date("2026-11-03T12:00:00+05:30")), -2);
  assert.equal(daysLeft("2026-02-30", new Date("2026-11-03T12:00:00+05:30")), null);
  assert.equal(daysLeft(null), null);
  assert.equal(daysLeft("invalid"), null);
  assert.equal(daysLeft("2026-11-05", "not a date"), null);
});

test("slugify", () => {
  assert.equal(slugify("Senior React Developer"), "senior-react-developer");
  assert.equal(slugify("Café Délhi"), "cafe-delhi");
  assert.equal(slugify("  Hello,  World!  "), "hello-world");
  assert.equal(slugify("AT&T and Co."), "at-and-t-and-co");
  assert.equal(slugify(""), "untitled");
  assert.equal(slugify("!!!???###"), "untitled");
  assert.equal(slugify(null), "untitled");
  assert.equal(slugify(undefined), "untitled");

  const longTitle = "A".repeat(80);
  assert.equal(slugify(longTitle).length, 60);
  assert.equal(slugify("A".repeat(59) + " - - - B"), "a".repeat(59));
});

test("truncate", () => {
  assert.equal(truncate("Hi", 5), "Hi");
  assert.equal(truncate("Hello world", 5), "Hell…");
  assert.equal(truncate("👨‍👩‍👧abc", 3), "👨‍👩‍👧a…");
  assert.equal(truncate("किताब", 3), "किताब");
  assert.equal(truncate("किताब", 2), "कि…");
  assert.equal(truncate("Hello", 0), "");
  assert.equal(truncate("Hello", 1), "…");
  assert.equal(truncate("", 5), "");
  assert.throws(() => truncate("Hello", -1), RangeError);
  assert.throws(() => truncate("Hello", 2.5), RangeError);
  assert.throws(() => truncate("Hello", "5"), RangeError);
});