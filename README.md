# rupee-kit 🪙

`rupee-kit` is a lightweight, zero-dependency JavaScript utility library used by CampusKart across its website, mobile application, and backend services to format and parse rupee amounts, split bills, compute inclusive GST, handle Indian Standard Time (IST) dates, and generate clean URL slugs.

---

## Running the Tests

Requirements: **Node.js 20 or newer**. No npm packages are required.

To run the full test suite:
```bash
npm test
```
Or directly using Node's native test runner:
```bash
node --test
```

To run tests with timezone set to UTC (mirroring the production server):
```bash
# On Linux / macOS / GitHub Actions
TZ=UTC npm test

# On Windows PowerShell
$env:TZ="UTC"; npm test
```

To run test coverage analysis:
```bash
node --test --experimental-test-coverage
```

---

## The 8 Bugs Found and Fixed

| # | File | Function | What Was Wrong (Root Cause) | How It Was Fixed |
|---|---|---|---|---|
| **1** | `money.js` | `formatINR` / `groupIndian` | Used left-to-right `.match(/\d{1,2}/g)` on digits before the last 3, producing `"15,0,000"` instead of `"1,50,000"` for odd digit counts. | Grouped digits in pairs from right to left using lookahead regex: `replace(/\d(?=(?:\d{2})+$)/g, "$&,")`. |
| **2** | `money.js` | `formatINR` | `toFixed(2)` and native rounding failed half-up rounding on binary floating-point representation (`1.005` in IEEE 754 is `1.00499...`, giving `"1.00"`). | Added an epsilon-stabilized floor formula (`Math.floor(Math.abs(amount) * 100 + 0.5 + 1e-9)`) to guarantee exact half-up rounding. |
| **3** | `money.js` | `parseINR` | `replace(",", "")` removed only the first comma, failing on Indian numbers with multiple commas like `"Rs. 1,20,000"`. | Replaced with `replaceAll(",", "")` to strip all commas across Indian and Western groupings. |
| **4** | `money.js` | `splitAmount` | Divided total by people and rounded each share individually, causing leftover paise to be lost and total sum to not equal bill total. Starter test missed this by only testing `300 / 3`. | Converted total to integer paise, performed integer division and distributed remainder paise (1 paisa each) to the first people. |
| **5** | `money.js` | `gstFromInclusive` | Used tax-exclusive formula `(price * rate) / 100` rather than inclusive formula `(price * 100) / (100 + rate)`, miscalculating base and tax. Starter test missed this by only testing 0% GST. | Corrected calculation to derive pre-tax `base = roundPaise((price * 100) / (100 + rate))` and `gst = roundPaise(price - base)`. |
| **6** | `dates.js` | `formatDateIN` | Used system local methods (`getDate()`, `getMonth()`), which gave incorrect dates when running on a UTC server for times late in the day. | Added Indian Standard Time offset (+5:30 / `330 * 60 * 1000` ms) and extracted UTC calendar components so dates are always in IST regardless of host timezone. |
| **7** | `text.js` | `slugify` | `.replace(/-+/, "-")` lacked the global `/g` flag, so only the first run of hyphens was collapsed. | Added `/g` flag (`/-+/g`), and stripped leading/trailing hyphens before and after slicing to 60 characters. |
| **8** | `text.js` | `truncate` | Sliced `max` characters and appended `"…"`, producing `max + 1` characters. Counted `.length` (UTF-16 code units) breaking emojis (👨‍👩‍👧) and Hindi letters (कि). Starter test had wrong expectation (`Hello…`). | Used `Intl.Segmenter` with `granularity: "grapheme"`, sliced `max - 1` graphemes when cut, and corrected the starter test expectation to `"Hell…"`. |

---

## Questions About `SPEC.md` for the Team

1. **`splitAmount` with negative or zero total**:
   *Current behavior*: Handled cleanly (negative totals distribute negative remainder paise to first people; zero returns zero shares).
   *Question*: Should `splitAmount` reject negative totals with a `RangeError`, or is splitting a refund / negative balance between friends a valid business case?
2. **`truncate` with `max = 0` or negative numbers**:
   *Current behavior*: Slices 0 graphemes, returning `""` for `max = 0`, and throws `RangeError` for invalid or negative `max`.
   *Question*: Should `truncate` return `""` silently for negative numbers or throw `RangeError` like `splitAmount` does?
3. **`formatINRShort` precision and thresholds**:
   *Current behavior*: Uses up to 2 decimal places with trailing zero trimming (e.g. `150000` → `"₹1.5 lakh"`, `100000` → `"₹1 lakh"`, `10000000` → `"₹1 crore"`).
   *Question*: Should amounts like `₹1,00,500` format as `"₹1.01 lakh"` or `"₹1 lakh"`? We rounded to 2 decimal places with trailing zeroes omitted.
4. **`daysLeft` date string whitespace handling**:
   *Current behavior*: Trims leading/trailing whitespace before regex matching.
   *Question*: Should whitespace be tolerated (e.g. `" 2026-11-05 "`) or strictly rejected with `null`?

---

## Test Coverage Report

Generated via `node --test --experimental-test-coverage`:

```
# ------------------------------------------------------------------
# file              | line % | branch % | funcs % | uncovered lines
# ------------------------------------------------------------------
# dates.js          | 100.00 |   100.00 |  100.00 | 
# money.js          | 100.00 |    94.23 |  100.00 | 
# rupee-kit.test.js | 100.00 |   100.00 |  100.00 | 
# text.js           | 100.00 |    93.75 |  100.00 | 
# ------------------------------------------------------------------
# all files         | 100.00 |    96.72 |  100.00 | 
# ------------------------------------------------------------------
```

**100.00% Line Coverage** achieved across all source files!

---

## Bonus Features Implemented

1. **Bonus Step 8: 1,000 Split Amount Verification Tests**:
   - Implemented a repeatable, deterministic pseudo-random linear congruential generator (LCG) loop test running 1,000 distinct combinations of bill totals and group sizes.
   - Verifies that every single split adds up to the total exactly down to the paisa, and remainder paise are distributed to the first participants.
2. **Bonus Step 9: GitHub Actions Workflow**:
   - Added `.github/workflows/test.yml` running on Node.js 20 in UTC timezone (`env: TZ: UTC`) on every push and pull request.
3. **Bonus Step 10: 100% Test Coverage**:
   - Comprehensive test suite covering every function, error condition (`RangeError`), and edge case.
4. **Bonus Step 11: `formatINRShort(amount)`**:
   - Added specification to `SPEC.md`, comprehensive unit test suite, and clean implementation in `money.js`.
---

## Walkthrough Video

- **Video Link**: [Watch 3-Minute Walkthrough Video (YouTube / Loom / Drive)](https://www.youtube.com/watch?v=YOUR_VIDEO_LINK_HERE) *(Replace with your unlisted video URL)*
- **Presentation Outline & Script**: See [VIDEO_SCRIPT.md](VIDEO_SCRIPT.md) for the full 3-minute walkthrough script explaining initial test failures, the rounding bug, and the date/timezone bug.