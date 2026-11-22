# 3-Minute Video Walkthrough Script & Talking Points

Use this guide when recording your 3-minute video presentation (e.g., using Loom or unlisted YouTube).

---

### Segment 1: Introduction & Initial Failure (0:00 - 0:45)
- **Introduction**: Introduce yourself and the `rupee-kit` library for CampusKart.
- **Show Initial Commit**:
  - Show the initial commit `b46050b` where untouched starter files are committed.
  - Run `npm test` on that state (or show terminal screenshot): point out that **4 tests failed** immediately (`groupIndian`, `paise round half up`, `parseINR commas`, and `slugify`).
  - Explain that beyond the 4 failing tests, **4 hidden bugs** existed that passed the starter test suite (including a wrong test in `truncate` and unexercised edge cases in `splitAmount`, `gstFromInclusive`, and `formatDateIN`).

---

### Segment 2: Deep Dive into Bug 2 — The Rounding Bug (0:45 - 1:30)
- **The Problem**:
  - `formatINR(1.005)` returned `"₹1.00"` instead of `"₹1.01"`.
- **Root Cause**:
  - In JavaScript, numbers use IEEE 754 double-precision floating point.
  - `1.005` cannot be stored precisely in binary; it is stored as `1.0049999999999998934...`.
  - When calling `toFixed(2)` or `Math.round(1.005 * 100)`, JavaScript rounds down to `1.00` because the floating-point value is slightly below the exact midway mark.
- **The Solution**:
  - We implemented an epsilon-stabilized floor calculation: `Math.floor(Math.abs(amount) * 100 + 0.5 + 1e-9)`.
  - Adding `1e-9` offsets the floating point representation loss, ensuring half-up rounding works reliably on every bill amount.

---

### Segment 3: Deep Dive into Bug 6 — The Date & Timezone Bug (1:30 - 2:15)
- **The Problem**:
  - The CampusKart server runs in **UTC** (London time), while customers are all in **India** (IST, UTC+5:30).
  - Calling `formatDateIN("2026-10-31T20:00:00Z")` on a server running in UTC returned `"31 Oct 2026"` instead of `"1 Nov 2026"`.
- **Root Cause**:
  - The original code used local methods like `date.getDate()` and `date.getMonth()`.
  - 8:00 PM UTC on October 31 is 1:30 AM on November 1 in India.
  - On a UTC server, local date methods queried UTC instead of Indian time.
  - The starter test used `2026-11-01T06:30:00Z` (12:00 PM IST), which happened to fall on the same day in UTC and IST, masking the bug.
- **The Solution**:
  - We offset epoch milliseconds by `+330` minutes (`IST_OFFSET_MS = 330 * 60 * 1000`) and extracted UTC date components (`getUTCDate()`, `getUTCMonth()`, `getUTCFullYear()`).
  - This ensures identical Indian calendar dates whether the code runs on a laptop in Pune or a server in London.

---

### Segment 4: Other Bugs, Bonus Steps & Verification (2:15 - 3:00)
- **Other Fixes**:
  - Mention Indian grouping regex (`formatINR`), `replaceAll` for commas (`parseINR`), integer remainder paise distribution (`splitAmount`), tax-inclusive formula (`gstFromInclusive`), global hyphen replacement (`slugify`), and `Intl.Segmenter` grapheme counting for emojis and Hindi text (`truncate`).
  - Mention fixing the wrong starter test in `rupee-kit.test.js`.
- **Demonstration**:
  - Run `npm test` live: show all 14 tests passing.
  - Run `node --test --experimental-test-coverage`: show **100% line coverage**.
  - Show the bonus features: 1,000 randomized split tests, `formatINRShort`, and GitHub Actions CI workflow in UTC.