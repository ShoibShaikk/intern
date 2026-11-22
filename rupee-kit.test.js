// The tests for rupee-kit. Run them with: npm test   (or: node --test)
// Written in a hurry before the last release. SPEC.md is the truth, not this file.

import assert from "node:assert/strict";
import test from "node:test";
import { formatINR, gstFromInclusive, parseINR, splitAmount } from "./money.js";
import { daysLeft, formatDateIN } from "./dates.js";
import { slugify, truncate } from "./text.js";

test("formatINR: small amounts", () => {
  assert.equal(formatINR(0), "₹0.00");
  assert.equal(formatINR(999), "₹999.00");
  assert.equal(formatINR(1234.5), "₹1,234.50");
});

test("formatINR: lakhs use Indian grouping", () => {
  assert.equal(formatINR(1234567), "₹12,34,567.00");
  assert.equal(formatINR(150000), "₹1,50,000.00");
});

test("formatINR: paise round half up", () => {
  assert.equal(formatINR(1.005), "₹1.01");
});

test("formatINR: negative amounts and junk", () => {
  assert.equal(formatINR(-2500), "-₹2,500.00");
  assert.equal(formatINR(NaN), "");
  assert.equal(formatINR("500"), "");
});

test("parseINR: prices people type", () => {
  assert.equal(parseINR("₹12,000"), 12000);
  assert.equal(parseINR("1.5 lakh"), 150000);
  assert.equal(parseINR("Rs. 1,20,000"), 120000);
});

test("parseINR: things it must refuse", () => {
  assert.equal(parseINR("15k"), null);
  assert.equal(parseINR(""), null);
  assert.equal(parseINR("-500"), null);
});

test("splitAmount: an even split", () => {
  assert.deepEqual(splitAmount(300, 3), [100, 100, 100]);
  assert.throws(() => splitAmount(300, 0), RangeError);
});

test("gstFromInclusive: zero GST", () => {
  assert.deepEqual(gstFromInclusive(500, 0), { base: 500, gst: 0 });
});

test("formatDateIN and daysLeft", () => {
  assert.equal(formatDateIN("2026-11-01T06:30:00Z"), "1 Nov 2026");
  assert.equal(formatDateIN("not a date"), "");
  assert.equal(daysLeft("2026-11-05", new Date("2026-11-03T12:00:00+05:30")), 2);
});

test("slugify", () => {
  assert.equal(slugify("Senior React Developer"), "senior-react-developer");
  assert.equal(slugify("Café Délhi"), "cafe-delhi");
  assert.equal(slugify("  Hello,  World!  "), "hello-world");
  assert.equal(slugify(""), "untitled");
});

test("truncate", () => {
  assert.equal(truncate("Hi", 5), "Hi");
  assert.equal(truncate("Hello world", 5), "Hello…");
});
