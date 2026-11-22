# Bug Reports: rupee-kit

This document catalogs all 8 planted bugs identified, reproduced, tested, and resolved in accordance with `SPEC.md`.

---

### Bug 1: Indian Number Grouping in `formatINR` / `groupIndian`

- **How to see it**:
  ```javascript
  formatINR(150000)
  ```
- **What happens and what should happen**:
  - *Observed*: Returned `"₹15,0,000.00"`.
  - *SPEC.md requirement*: "Indian grouping: the last 3 digits, then groups of 2. `1234567` → `"₹12,34,567.00"`. `100000` → `"₹1,00,000.00"`." Expected output: `"₹1,50,000.00"`.
- **Why it happens (Root Cause)**:
  In `groupIndian(digits)`, the remaining digits preceding the last 3 digits were matched using `rest.match(/\d{1,2}/g)`. Because regular expression matching proceeds from left to right, for numbers with an odd number of leading digits (such as `"150"` in `150000`), the engine matched `"15"` then `"0"`, producing `"15,0,000"` instead of grouping in pairs from right to left (`"1,50,000"`).
- **The fix**:
  Replaced left-to-right regex matching with a regex lookahead that inserts commas every two digits counted from the right:
  `rest.replace(/\d(?=(?:\d{2})+$)/g, "$&,")`.
  - *Commit*: `98372f3` ("Improve Indian number grouping in groupIndian function").
- **The test that proves it**:
  `test("formatINR: lakhs and crores use Indian grouping")` in `rupee-kit.test.js`.

---

### Bug 2: Floating Point Half-Up Rounding in `formatINR`

- **How to see it**:
  ```javascript
  formatINR(1.005)
  ```
- **What happens and what should happen**:
  - *Observed*: Returned `"₹1.00"`.
  - *SPEC.md requirement*: "Rounding to paise is **half up**, as on a printed bill: `2.675` → `"₹2.68"`, `0.125` → `"₹0.13"`." Expected output: `"₹1.01"`.
- **Why it happens (Root Cause)**:
  In standard IEEE 754 floating-point arithmetic, the decimal value `1.005` cannot be represented with exact binary precision; its true stored value is approximately `1.0049999999999998934...`. Relying on native `Number.prototype.toFixed(2)` or naive `Math.round(amount * 100)` rounds down toward `1.00` because the floating-point value is slightly below the half-way threshold.
- **The fix**:
  Compute paise using an epsilon-stabilized floor formula: `Math.floor(Math.abs(amount) * 100 + 0.5 + 1e-9)`. This ensures that boundary cases like `1.005`, `2.675`, and `0.125` round half up reliably.
  - *Commit*: `63a53ad` ("Refactor formatINR for improved currency formatting").
- **The test that proves it**:
  `test("formatINR: paise round half up")` in `rupee-kit.test.js`.

---

### Bug 3: Single-Comma Replacement in `parseINR`

- **How to see it**:
  ```javascript
  parseINR("Rs. 1,20,000")
  ```
- **What happens and what should happen**:
  - *Observed*: Returned `null`.
  - *SPEC.md requirement*: "It may use commas, in Indian or Western grouping: `"1,20,000"` and `"120,000"` are both 120000." Expected output: `120000`.
- **Why it happens (Root Cause)**:
  The starter code called `value = value.replace(",", "")`. In JavaScript, passing a string literal to `String.prototype.replace()` replaces only the *first* occurrence of that substring. For `"1,20,000"`, only the first comma was removed, leaving `"120,000"`. The subsequent numeric regex `/^(\d+(?:\.\d+)?)...$/` failed on the second comma and returned `null`.
- **The fix**:
  Replaced `replace(",", "")` with `replaceAll(",", "")` to strip all commas regardless of grouping.
  - *Commit*: `a32d0a4` ("Replace replace with replaceAll for commas").
- **The test that proves it**:
  `test("parseINR: Western and Indian comma grouping")` and `test("parseINR: prices people type")` in `rupee-kit.test.js`.

---

### Bug 4: Remainder Paise Lost in `splitAmount`

- **How to see it**:
  ```javascript
  splitAmount(100, 3)
  ```
- **What happens and what should happen**:
  - *Observed*: Returned `[33.33, 33.33, 33.33]` (summing to ₹99.99, losing 1 paisa).
  - *SPEC.md requirement*: "The shares always add up to the total exactly, to the paisa. When it doesn't divide evenly, the leftover paise go to the **first** people, 1 paisa each. `splitAmount(100, 3)` → `[33.34, 33.33, 33.33]`."
- **Why it happens (Root Cause)**:
  The function calculated a single share using `const share = roundPaise(total / people)` and filled the entire array with that identical rounded value (`[33.33, 33.33, 33.33]`). The starter test only tested `splitAmount(300, 3)`, which divides evenly and masked this bug completely.
- **The fix**:
  Convert `total` to integer paise `totalPaise = Math.round(total * 100)`. Compute base integer share `basePaise = Math.trunc(totalPaise / people)` and remainder `remainder = totalPaise % people`. Allocate an extra 1 paisa (`basePaise + 1`) to each of the first `remainder` participants, then convert back to rupees.
  - *Commit*: `55fa3b1` ("Improve splitAmount function for precise bill splitting").
- **The test that proves it**:
  `test("splitAmount: an even split and remainder paise")` and `test("splitAmount: 1,000 randomized deterministic test cases (bonus)")` in `rupee-kit.test.js`.

---

### Bug 5: Inclusive GST Calculated with Exclusive Formula in `gstFromInclusive`

- **How to see it**:
  ```javascript
  gstFromInclusive(1180, 18)
  ```
- **What happens and what should happen**:
  - *Observed*: Returned `{ base: 967.6, gst: 212.4 }`.
  - *SPEC.md requirement*: "Every price on our website **already includes GST**. This works out how much of the price is GST. `base` is the price before GST: `price × 100 ÷ (100 + rate)`, rounded to paise. `gst` is the rest: `price − base`. So `base + gst` is always exactly the price. Example: a ₹1,180 item at 18% GST is ₹1,000 base + ₹180 GST."
- **Why it happens (Root Cause)**:
  The starter code computed GST using the tax-exclusive formula `const gst = roundPaise((price * ratePercent) / 100)` and derived `base = price - gst`. For ₹1,180 at 18%, this incorrectly treated ₹1,180 as pre-tax base. The starter test only tested `gstFromInclusive(500, 0)`, which masked the calculation error because `0%` tax always yields `0` GST.
- **The fix**:
  Compute `base` first using the tax-inclusive formula `roundPaise((price * 100) / (100 + ratePercent))`, and derive `gst` as `roundPaise(price - base)`.
  - *Commit*: `7e17757` and `0815ddd` ("fix(money): compute base first and derive gst in gstFromInclusive").
- **The test that proves it**:
  `test("gstFromInclusive: zero and non-zero GST")` in `rupee-kit.test.js`.

---

### Bug 6: Local System Timezone Used Instead of IST in `formatDateIN`

- **How to see it**:
  ```javascript
  formatDateIN("2026-10-31T20:00:00Z") // executed on a machine or server running in UTC
  ```
- **What happens and what should happen**:
  - *Observed*: Returned `"31 Oct 2026"`.
  - *SPEC.md requirement*: "Our server runs in **UTC** (London time, no summer time). Our customers are all in **India**. It's always the date in India (IST, UTC+5:30), whatever time zone the computer is in. The same moment must show the same date on a laptop in Pune and on our server in UTC." Expected output: `"1 Nov 2026"`.
- **Why it happens (Root Cause)**:
  `formatDateIN` called `date.getDate()`, `date.getMonth()`, and `date.getFullYear()`. These native methods query the local system clock. On a UTC server, 20:00:00 UTC on October 31 is still October 31, but in India (UTC+5:30) it is 01:30:00 AM on November 1. The starter test passed only because it used `2026-11-01T06:30:00Z` (12:00 PM IST), which happened to share the same calendar date in UTC and IST.
- **The fix**:
  Offset the timestamp by `+330` minutes (`const istDate = new Date(date.getTime() + IST_OFFSET_MS)`) and read UTC calendar components: `istDate.getUTCDate()`, `MONTHS[istDate.getUTCMonth()]`, `istDate.getUTCFullYear()`.
  - *Commit*: `acd92b6` ("fix(dates): enforce IST in formatDateIN and validate calendar dates in daysLeft").
- **The test that proves it**:
  `test("formatDateIN and daysLeft")` in `rupee-kit.test.js`.

---

### Bug 7: Non-Global Hyphen Collapse in `slugify`

- **How to see it**:
  ```javascript
  slugify("  Hello,  World!  ")
  ```
- **What happens and what should happen**:
  - *Observed*: Returned `"hello---world-"`.
  - *SPEC.md requirement*: "Every run of other characters (spaces, commas, `!`, `/`...) becomes **one** hyphen. No hyphen at the start or the end." Expected output: `"hello-world"`.
- **Why it happens (Root Cause)**:
  The regex replacement `.replace(/-+/, "-")` lacked the global flag (`/g`). Consequently, only the first consecutive run of hyphens was collapsed into a single hyphen; subsequent runs remained untouched, and edge hyphens persisted.
- **The fix**:
  Added the global flag `/g`: `.replace(/-+/g, "-")`, combined with regex trimming for edge hyphens: `.replace(/^-+|-+$/g, "")` and `.replace(/-+$/, "")` after truncating to 60 characters.
  - *Commit*: `e245cda` ("fix(text): collapse all runs of hyphens and fix UTF-8 encoding in slugify").
- **The test that proves it**:
  `test("slugify")` in `rupee-kit.test.js`.

---

### Bug 8: Grapheme Cluster Truncation, Ellipsis Length, and Wrong Starter Test in `truncate`

- **How to see it**:
  ```javascript
  truncate("Hello world", 5)
  truncate("👨‍👩‍👧abc", 3)
  ```
- **What happens and what should happen**:
  - *Observed*:
    1. `truncate("Hello world", 5)` returned `"Hello…"` (6 characters).
    2. Emojis and multi-code-unit graphemes (e.g. `👨‍👩‍👧` or Hindi characters like `कि`) were broken or miscounted because `.length` counts UTF-16 code units.
    3. The starter test had an incorrect expectation: `assert.equal(truncate("Hello world", 5), "Hello…")`.
  - *SPEC.md requirement*:
    "Characters are counted **the way a person sees them**. An emoji (even a family emoji like 👨‍👩‍👧) is 1 character. A Hindi letter with its vowel sign (like कि) is 1 character. If the text has `max` characters or fewer, it comes back unchanged. Otherwise it's cut and `"…"` is added, so the result has **exactly `max` characters, counting the "…"**. `truncate("Hello world", 5)` → `"Hell…"`. It never cuts an emoji or a letter in half."
- **Why it happens (Root Cause)**:
  1. The starter code called `value.slice(0, max) + "…"`, which appends the ellipsis after taking `max` characters, producing `max + 1` characters.
  2. Native `.slice()` and `.length` operate on UTF-16 code units, not user-perceived grapheme clusters. An emoji like `👨‍👩‍👧` consists of multiple unicode codepoints joined by ZWJs, and Hindi conjuncts like `कि` comprise base consonants plus dependent vowel signs.
  3. The author of the starter tests wrote `"Hello…"` in `rupee-kit.test.js`, directly contradicting `SPEC.md`.
- **The fix**:
  1. Segment text into grapheme clusters using `new Intl.Segmenter(undefined, { granularity: "grapheme" })`.
  2. If grapheme length exceeds `max`, slice the first `max - 1` graphemes and append `"…"`.
  3. Correct the assertion in `rupee-kit.test.js` from `"Hello…"` to `"Hell…"`.
  - *Commit*: `7e5f007` ("fix(text): respect max length including ellipsis and grapheme clusters in truncate").
- **The test that proves it**:
  `test("truncate")` in `rupee-kit.test.js`.