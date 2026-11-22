# rupee-kit: what every function must do

rupee-kit is a small JavaScript library. It's used by the shop website, the mobile app and the
server, to show prices, split bills, work out GST and make links.

**This file is the truth.** If the code or a test disagrees with this file, the code or the test is
wrong. If this file doesn't say something, ask before you change how the code behaves.

Our server runs in **UTC** (London time, no summer time). Our customers are all in **India**.

---

## money.js

### `formatINR(amount)`

Shows a rupee amount the Indian way.

- Indian grouping: the last 3 digits, then groups of 2. `1234567` → `"₹12,34,567.00"`.
- Always 2 decimals (paise).
- Rounding to paise is **half up**, as on a printed bill: `2.675` → `"₹2.68"`, `0.125` → `"₹0.13"`.
- Negative amounts put the minus first: `-2500` → `"-₹2,500.00"`.
- Anything that isn't a finite number (`NaN`, `Infinity`, `"500"`, `null`) → `""` (an empty string).

| Input | Output |
| --- | --- |
| `0` | `"₹0.00"` |
| `999` | `"₹999.00"` |
| `1234.5` | `"₹1,234.50"` |
| `100000` | `"₹1,00,000.00"` |
| `25000000` | `"₹2,50,00,000.00"` |
| `-2500` | `"-₹2,500.00"` |

### `formatINRShort(amount)`

Shows a compact rupee amount using lakh or crore for large numbers.

- For amounts from 10,000,000 (1 crore) and above, shows in crore: `10000000` → `"₹1 crore"`, `25000000` → `"₹2.5 crore"`.
- For amounts from 100,000 (1 lakh) up to 9,999,999, shows in lakh: `150000` → `"₹1.5 lakh"`, `100000` → `"₹1 lakh"`.
- Trim trailing zeros after the decimal point: `"₹1.5 lakh"`, `"₹1 lakh"`, not `"₹1.0 lakh"`. Maximum 2 decimal places.
- Amounts under 100,000 use `formatINR(amount)`.
- Rounding is half up to 2 decimal places.
- Negative amounts put the minus first: `-150000` → `"-₹1.5 lakh"`.
- Non-finite numbers (`NaN`, `Infinity`, `"150000"`, `null`) → `""`.

### `parseINR(text)`

Reads a price typed by a person, and returns a number of rupees (rounded to paise).

- It may start with `₹`, `Rs`, `Rs.` or `INR`, in any capitals, with or without a space.
- It may use commas, in Indian or Western grouping: `"1,20,000"` and `"120,000"` are both 120000.
- It may end with **lakh** (100,000) or **crore** (10,000,000), as a word: `lakh`, `lakhs`, `lac`,
  `lacs`, `crore`, `crores` or `cr`. `"1.5 lakh"` → 150000.
- A plain number is returned as it is (rounded to paise), if it's 0 or more.
- **Shorthand like `"15k"` is NOT accepted** and returns `null`. (Our sellers mixed up "k" and "lakh"
  too often. This is on purpose: don't "fix" it.)
- Anything else (empty, negative, words, two numbers) → `null`.

### `splitAmount(total, people)`

Splits a bill between friends.

- Returns an array with one share per person, each rounded to paise.
- **The shares always add up to the total exactly, to the paisa.**
- When it doesn't divide evenly, the leftover paise go to the **first** people, 1 paisa each.
  `splitAmount(100, 3)` → `[33.34, 33.33, 33.33]`.
- `people` must be a whole number, 1 or more. Otherwise it throws a `RangeError`.

### `gstFromInclusive(price, ratePercent)`

Every price on our website **already includes GST**. This works out how much of the price is GST.

- `base` is the price before GST: `price × 100 ÷ (100 + rate)`, rounded to paise.
- `gst` is the rest: `price − base`. So `base + gst` is always exactly the price.
- Example: a ₹1,180 item at 18% GST is ₹1,000 base + ₹180 GST.
- `ratePercent` must be between 0 and 100. Otherwise it throws a `RangeError`.

---

## dates.js

### `formatDateIN(value)`

Shows a date as day, short month and year: `"1 Nov 2026"`.

- `value` can be a `Date`, an ISO string (`"2026-11-01T06:30:00Z"`) or a timestamp in milliseconds.
- **It's always the date in India (IST, UTC+5:30), whatever time zone the computer is in.** The same
  moment must show the same date on a laptop in Pune and on our server in UTC.
- No leading zero on the day: `"4 Nov 2026"`, not `"04 Nov 2026"`.
- Missing or invalid input (`null`, `""`, `"not a date"`) → `""`. It never throws, and never shows
  "Invalid Date". (This is on purpose: pages show a blank, not an error.)

### `daysLeft(deadline, now = new Date())`

How many whole days until a deadline, counted in Indian calendar days.

- `deadline` is a `"YYYY-MM-DD"` string, meaning that day in India.
- On the deadline day itself → `0`. The day before → `1`. After it → negative.
- Not a `"YYYY-MM-DD"` string → `null`.

---

## text.js

### `slugify(title)`

Turns a title into the last part of a link: `"Senior React Developer"` → `"senior-react-developer"`.

- Lower case. Accents are removed (`é` → `e`). `&` becomes `and`.
- Every run of other characters (spaces, commas, `!`, `/`...) becomes **one** hyphen.
- No hyphen at the start or the end.
- At most 60 characters (and still no hyphen at the end after cutting).
- If nothing is left (an empty title, or only symbols) → `"untitled"`.

### `truncate(text, max)`

Shortens text for a card, so it fits.

- Characters are counted **the way a person sees them**. An emoji (even a family emoji like 👨‍👩‍👧) is 1
  character. A Hindi letter with its vowel sign (like कि) is 1 character.
- If the text has `max` characters or fewer, it comes back unchanged.
- Otherwise it's cut and `"…"` is added, so the result has **exactly `max` characters, counting the "…"**.
  `truncate("Hello world", 5)` → `"Hell…"`.
- It never cuts an emoji or a letter in half.