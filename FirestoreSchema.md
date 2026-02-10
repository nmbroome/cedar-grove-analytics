# Cedar Grove Analytics — Firestore Schema

## Overview

This document defines the Firestore database schema for Cedar Grove Analytics, a legal time tracking and billing dashboard. The system syncs user timesheet data from Google Sheets into Firestore and serves it to a Next.js dashboard.

The schema stores entry data in **per-month array documents**: all billable entries for a given user and month live in a single document, as do ops entries and 83(b) elections. This eliminates duplication from multiple sync runs and minimizes Firestore reads. The dashboard aggregates data client-side from these entry arrays.

---

## Data Source

Each user has a Google Sheets workbook named `{year} - Invoices ({lastName})` (e.g., `2026 - Invoices (Ohta)`). Each workbook contains one sheet per month (January, February, etc.).

Each sheet has a header row (row 9) with the following columns:

| Columns 1–8 (Billable Work) | Columns 10–13 (Ops Work) | Columns 15–17 (83(b) Elections) |
|---|---|---|
| Client | Ops (description) | Company |
| Date | Category | Name |
| Hours | Date | Flat Fee |
| Billables Earnings | Hours | |
| Billing Category | | |
| Matter | | |
| Reimbursements | | |
| Notes | | |

A single sheet row may contain billable data, ops data, both, or an 83(b) election entry. The sync script parses each row and writes to the appropriate collections based on which columns have data.

Rows 1–8 contain summary totals that are synced as `sheetTotals` metadata on the Firestore documents for dashboard validation:

| Row | Column A Label | Column B Value | Column E Label | Column F Value |
|-----|---------------|----------------|----------------|----------------|
| 1 | Total Billable Hours | 87.40 | Ops Hours | 102.7 |
| 2 | Billable Earnings | $29,497.50 | Total Hours (Ops/Billables) | 190.10 |
| 3 | Reimbursements | $686 | | |
| 4 | Rate | $337.50 | | |
| 5 | 83(b) Fee Earnings | $162.50 | | |
| 6 | Total Payment | $30,346.20 | | |
| 7–8 | *(blank / section header)* | | | |

**Note:** The Rate field (row 4) represents the attorney's take-home rate, not their billing rate, and is intentionally **not synced**. Some sheets do not have ops or 83(b) sections — those values will be `0`.

---

## Collection Structure

```
firestore-root/
│
└── users/{userId}/                       # User profile document (name, role, email)
    ├── rates/{year}_{month}              # Billing rate for one month
    ├── targets/{year}_{month}            # Performance targets for one month
    ├── billables/{year}_{month}          # All billable entries for one month
    ├── ops/{year}_{month}                # All ops entries for one month
    └── eightThreeB/{year}_{month}        # 83(b) election entries for one month
```

### Document ID Format

All per-month documents use the ID format `{year}_{month}` (e.g., `2026_January`). The year is always derived from the spreadsheet name, never from date cell parsing.

### User IDs

User IDs are full names as stored in Firestore: `"Michael Ohta"`, etc. These are used as document IDs in the `users` collection and as the `userId` field on all entry data.

---

## Document: `users/{userId}`

The user profile document. Stores identity, role, billing rate, and performance targets. This document is created and maintained via the admin User Management page (`/admin/user-management`) — the sync script does not read or write to it.

### Document Schema

```javascript
{
  name: "Michael Ohta",                   // string — display name
  role: "Attorney",                        // string — "Attorney", "Legal Operations Associate", etc.
  email: "michael@cedargrove.law",         // string — login email (used for access control)
  employmentType: "FTE",                   // string — "FTE" (full-time) or "PTE" (part-time)

  // Billing rates (one entry per active month)
  rates: [
    { month: "January", year: 2026, rate: 337.50 },
    { month: "February", year: 2026, rate: 337.50 },
    { month: "March", year: 2026, rate: 350.00 }
    // ... one entry per month the user is active
  ],

  // Monthly targets (one entry per active month)
  targets: [
    {
      month: "January",
      year: 2026,
      billableHours: 100,                  // number — target billable hours
      opsHours: 80,                        // number — target ops hours
      totalHours: 180,                     // number — target total hours
      earnings: 33750.00                   // number — target earnings
    },
    {
      month: "February",
      year: 2026,
      billableHours: 100,
      opsHours: 80,
      totalHours: 180,
      earnings: 33750.00
    }
    // ... one entry per month the user is active
  ]
}
```

### User Roles

Current roles include:

- `"Attorney"` — licensed attorneys who bill client hours
- `"Legal Operations Associate"` — operations staff who track ops hours

The role is a free-text field on the user document, not on individual entry documents. The dashboard reads the user profile once and applies the role for display, filtering, and grouping.

### Email & Access Control

The `email` field on the user document is used for access control. When a non-admin user logs in, the dashboard matches their Firebase Auth email against user documents to determine which attorney detail page they can access. Non-admin users are automatically redirected to their own attorney page on login. Admin users can access all pages.

### Employment Types

- `"FTE"` — Full-time employee
- `"PTE"` — Part-time employee

The employment type is set via the admin User Management page. New users default to `"PTE"`. Existing users without the field default to `"FTE"` at read time.

### Rate and Targets

Both `rates` and `targets` are arrays with one entry per active month, keyed by `month` and `year`. This allows rates and goals to change over time while preserving historical values for any given month.

The `rates` array stores the user's hourly billing rate for each month. The rate in the spreadsheet (row 4) is informational only; the Firestore value is the source of truth for the dashboard. When a rate changes (e.g., an annual increase), a new entry is added for subsequent months — previous months retain their original rate.

The `targets` array stores monthly performance goals. These are used by the dashboard to render progress indicators, percentage-of-target metrics, and pacing calculations. Targets can vary month to month (e.g., reduced targets during holidays or ramp-up periods).

The dashboard looks up the rate and targets for the selected month by matching on `month` + `year`. If no entry exists for a given month, the dashboard can fall back to the most recent prior entry or display no target.

---

## Collection: `users/{userId}/billables/{year}_{month}`

Stores all billable time entries for one user for one month as an array within a single document. Each element in the `entries` array represents one row from the billable (left-side) columns of the spreadsheet.

Only rows that have at least one of: client, billable date, or billable hours are included.

### Document Schema

```javascript
{
  // Metadata
  userId: "Michael Ohta",                // string — full user name
  month: "January",                      // string — month name
  monthNumber: 1,                        // number — 1-indexed month (1 = January)
  year: 2026,                            // number — derived from spreadsheet name
  syncedAt: Timestamp,                   // Firestore Timestamp — when this doc was last written
  entryCount: 218,                       // number — length of entries array

  // Sheet summary totals (from rows 1–8 of the spreadsheet, used for dashboard validation)
  sheetTotals: {
    totalBillableHours: 87.40,           // number — from row 1 col B
    billableEarnings: 29497.50,          // number — from row 2 col B
    reimbursements: 686.00,              // number — from row 3 col B
    totalPayment: 30346.20,              // number — from row 6 col B
  },

  // Entry array
  entries: [
    {
      client: "C47 Inc.",                // string — client name
      date: Timestamp,                   // Firestore Timestamp — billable date
      hours: 0.6,                        // number — billable hours
      earnings: 203.00,                  // number — dollar amount (parsed from "$203" format)
      billingCategory: "General Diligence", // string — billing category
      matter: "YC Application Questions",   // string — matter name (may be empty)
      reimbursements: 0,                 // number — reimbursement amount
      notes: "Review corporate records", // string — work description
      sheetRowNumber: 11                 // number — original row in the spreadsheet (for debugging)
    }
    // ... one object per billable row
  ]
}
```

### Field Notes

- `earnings`: Parsed from the spreadsheet's currency format (e.g., `"$709"` or `"$29,497.50"` → `709` or `29497.50`). Stored as a plain number, not a string.
- `date`: The billable date from the spreadsheet. Dates in the sheet are formatted as `M/D` (e.g., `1/2`, `1/14`). The year is appended from the spreadsheet name during sync. Stored as a Firestore Timestamp.
- `matter`: May be empty string if no matter is specified for that entry.
- `reimbursements`: Defaults to `0` if the cell is empty.
- `sheetRowNumber`: The actual row number in the spreadsheet (1-indexed, accounting for the header row at row 9). Used only for debugging and tracing back to the source data.
- `sheetTotals`: Summary values from the spreadsheet header (rows 1–8). Used by the dashboard to validate that computed entry sums match the spreadsheet's own totals. The `totalPayment` field represents the total of billable earnings + reimbursements + 83(b) fees. Not present on documents synced before this feature was added.

---

## Collection: `users/{userId}/ops/{year}_{month}`

Stores all ops (non-billable) time entries for one user for one month. Structure mirrors billables but with ops-specific fields.

Only rows that have at least one of: ops description, ops date, or ops hours are included.

### Document Schema

```javascript
{
  // Metadata
  userId: "Michael Ohta",
  month: "January",
  monthNumber: 1,
  year: 2026,
  syncedAt: Timestamp,
  entryCount: 157,

  // Sheet summary totals (from rows 1–8 of the spreadsheet, used for dashboard validation)
  sheetTotals: {
    opsHours: 102.70,                    // number — from row 1 col F
    totalHours: 190.10,                  // number — from row 2 col F (billable + ops combined)
  },

  // Entry array
  entries: [
    {
      description: "Work on Ironclad incorporation workflow", // string — ops work description
      date: Timestamp,                   // Firestore Timestamp — ops date
      hours: 3.5,                        // number — ops hours
      category: "Systems & Automation",  // string — ops category
      sheetRowNumber: 11                 // number — original spreadsheet row
    }
    // ... one object per ops row
  ]
}
```

### Field Notes

- `description`: The "Ops" column from the spreadsheet — a free-text description of the non-billable work.
- `category`: The ops category (e.g., "Systems & Automation", "Business Development", "Team Meeting", "Billing", "Knowledge Management", "Pro Bono", "Write-Off", "Employee Matters", "Motions/Forms", "Educational Content").
- `date`: The ops date column (the second "Date" column in the spreadsheet). May differ from the billable date on the same row.
- A single spreadsheet row can produce both a billable entry and an ops entry. They share the same `sheetRowNumber` but live in different collections.

---

## Collection: `users/{userId}/eightThreeB/{year}_{month}`

Stores 83(b) election filings for one user for one month. These represent flat-fee administrative filings that are separate from hourly billable work and ops time.

Only rows that have at least one of: company name, individual name, or flat fee amount are included.

### Document Schema

```javascript
{
  // Metadata
  userId: "Michael Ohta",
  month: "January",
  monthNumber: 1,
  year: 2026,
  syncedAt: Timestamp,
  entryCount: 1,
  totalFlatFees: 250.00,              // number — sum of all flat fees in the entries array

  // Sheet summary totals (from rows 1–8 of the spreadsheet, used for dashboard validation)
  sheetTotals: {
    eightThreeBFeeEarnings: 162.50,    // number — from row 5 col B
  },

  // Entry array
  entries: [
    {
      company: "Refer Services, Inc.",   // string — company name
      name: "Renata Yumi Kobayashi",     // string — individual filing the 83(b)
      flatFee: 250.00,                   // number — flat fee amount
      sheetRowNumber: 10                 // number — original spreadsheet row
    }
    // ... one object per 83(b) filing
  ]
}
```

### Field Notes

- 83(b) elections appear in columns 15–17 of the spreadsheet (Company, Name, Flat Fee).
- A single spreadsheet row can have billable data, ops data, and an 83(b) entry simultaneously. Each goes to its respective collection.
- `totalFlatFees` is pre-summed at the document level for quick access without iterating the array.
- Months with no 83(b) entries will not have a document in this collection.

---

## Dashboard Usage

The dashboard aggregates data client-side from the raw entry arrays. There are no pre-computed summary documents.

| Dashboard View | Data Source | Reads per User |
|---|---|---|
| User profile (name, role, rate) | `users/{userId}` | 1 |
| KPI cards (hours, earnings) | `billables` + `ops` | 2 |
| Progress-to-target indicators | `users/{userId}` targets array (filter by month/year) | 0 (already loaded) |
| Client breakdown table | `billables` entries array | 0 (already loaded) |
| Billing category pie chart | `billables` entries array | 0 (already loaded) |
| Ops category breakdown | `ops` entries array | 0 (already loaded) |
| Daily trend line chart | `billables` + `ops` entries (group by date) | 0 (already loaded) |
| Matter-level drill-down | `billables` entries array | 0 (already loaded) |
| 83(b) election details | `eightThreeB/{year}_{month}` | 0–1 |
| Data validation warnings | `billables` + `ops` + `eightThreeB` sheetTotals | 0 (already loaded) |
| Cross-month trend (e.g., Q1) | Multiple `billables` + `ops` docs | 4–6 |

A typical month view for one user requires 4 reads: user profile, billables document, ops document, and eightThreeB document. The dashboard fetches all three subcollections for each user on initial load.

### Data Validation (Warnings)

The dashboard compares computed entry sums against the `sheetTotals` stored on each document and displays warnings on the team members table and attorney detail pages when mismatches are detected. The following checks are performed:

| Warning Type | Comparison |
|---|---|
| Date mismatch | Entry-level date vs parent document's month/year |
| Billable hours mismatch | Sum of entry `hours` vs `sheetTotals.totalBillableHours` |
| Billable earnings mismatch | Sum of entry `earnings` vs `sheetTotals.billableEarnings` |
| Ops hours mismatch | Sum of entry `hours` vs `sheetTotals.opsHours` |
| 83(b) fee earnings mismatch | Sum of entry `flatFee` vs `sheetTotals.eightThreeBFeeEarnings` |
| Total hours mismatch | (billable hours + ops hours) vs `sheetTotals.totalHours` |
| Total payment mismatch | (billable earnings + reimbursements + 83(b) fees) vs `sheetTotals.totalPayment` |

Warnings only appear when `sheetTotals` are present on the document (i.e., after the sync script has been re-run to populate them).

---

## Sync Architecture

### Sync Flow

```
Google Sheet → Apps Script → Firestore
                  │
                  ├── 1. Parse sheet summary totals (rows 1–8)
                  ├── 2. Parse sheet entry rows (rows 10+)
                  ├── 3. Separate billable, ops, and 83(b) entries
                  ├── 4. Delete-and-replace: overwrite billables/{year}_{month}  (with sheetTotals)
                  ├── 5. Delete-and-replace: overwrite ops/{year}_{month}  (with sheetTotals)
                  └── 6. Delete-and-replace: overwrite eightThreeB/{year}_{month}  (with sheetTotals, if entries exist)
```

### Year Detection

The sync year is **always derived from the spreadsheet name**, never from date cell values:

```javascript
function getSpreadsheetYear(ss) {
  const name = ss.getName();
  const match = name.match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
}
```

This prevents year detection bugs when date cells contain ambiguous formats like `1/2` (which could be parsed as any year depending on runtime context).

### Delete-and-Replace Strategy

Each sync overwrites the entire month's document in a single write operation. Because billables and ops are stored as arrays within single documents (not as individual subcollection documents), replacing a month's data is a single Firestore write per collection — no reads required for cleanup.

```javascript
// One write replaces all of January's billable entries
setDoc(doc(db, 'users', userId, 'billables', '2026_January'), {
  entries: [...parsedBillableEntries],
  // ... metadata
});
```

### Cost Per Sync (Per User Per Month)

| Operation | Reads | Writes |
|---|---|---|
| Write billables document | 0 | 1 |
| Write ops document | 0 | 1 |
| Write 83(b) elections document | 0 | 0–1 |
| **Total** | **0** | **2–3** |

### Triggers

- **Daily sync**: Triggered by Apps Script time-driven trigger. Syncs the current month for the active spreadsheet.
- **Manual sync**: `forceSyncSpecificMonth("January")` for re-syncing a specific month.
- **Full re-sync**: Iterates all 12 month sheets and syncs each.

---

## Row Parsing Rules

### Billable Entry (Left Side of Sheet)

A row produces a billable entry if it has at least one of:
- A non-empty `Client` value (column 1)
- A non-empty billable `Date` value (column 2)
- A non-zero billable `Hours` value (column 3)

### Ops Entry (Right Side of Sheet)

A row produces an ops entry if it has at least one of:
- A non-empty `Ops` description (column 10)
- A non-empty ops `Date` value (column 12)
- A non-zero ops `Hours` value (column 13)

### 83(b) Election Entry

Rows with data in columns 15–17 (Company, Name, Flat Fee) represent 83(b) election filings. These are tracked separately and do not count toward billable or ops hours.

### Skipped Rows

- Rows where all relevant columns are empty are skipped entirely.
- Rows 1–8 (summary area) are parsed for `sheetTotals` metadata only — they are not processed as entries.
- Rows after the last populated row in the sheet are ignored.
- Rows with `$0` earnings and no other data are skipped.

---

## Firestore Indexes

### Required Composite Indexes

None required for the primary dashboard flow. Since each data access reads a single known document by path (e.g., `billables/2026_January`), no query indexes are needed.

### Collection Group Queries

The new schema does **not** use `collectionGroup` queries. All data access is by direct document path. This eliminates the need for collection group indexes and avoids the duplication/stale-data issues that plagued the previous `entries`-based architecture.

---

## Migration from Legacy Schema

### Legacy Schema (Deprecated)

The previous schema stored individual entries as separate documents:

```
users/{userId}/entries/{docId}
```

Where `docId` was `{userId}_{year}_{month}_row{rowNumber}`. This caused:

- **Duplicate documents** from multiple sync runs with different ID patterns
- **Year detection bugs** from parsing date cells instead of spreadsheet names
- **Expensive reads** — the dashboard fetched all entries via `collectionGroup('entries')` and aggregated client-side
- **Stale data** — no cleanup mechanism for orphaned documents

### Migration Steps

1. Deploy the new sync script with the updated schema
2. Run the sync for each user and each month to populate the new collections
3. Verify dashboard reads from the new collections
4. Delete the legacy `entries` subcollections once confirmed