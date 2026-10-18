# Devis Transitaires: Technical Documentation

## Scope and source of truth

This document describes the standalone application in [Devis Transitaires.html](Devis%20Transitaires.html). It documents the file as it exists in this workspace, not the separate React application under `app/` and not earlier copies referenced by the French analysis note.

The application is a single HTML document containing its markup, CSS, seed data, application state, rendering code, and calculation engine. It does not require a build step, a JavaScript framework, or a backend. The user interface and messages are in French; this reference is in English.

Relevant source map:

| Source area | Responsibility |
| --- | --- |
| [HTML and styles](Devis%20Transitaires.html#L1) | Document shell, design tokens, layout, responsive rules, light/dark themes |
| [State and defaults](Devis%20Transitaires.html#L251) | Default parameters, draft creation, category suggestions, local state loading |
| [Calculation engine](Devis%20Transitaires.html#L317) | Unit quantities, cost/date calculations, offer-service calendar lookup, cutoff policy, offer ranking |
| [Payment allocation](Devis%20Transitaires.html#L418) | Shared transaction-fee distribution and reversible grouping |
| [Navigation and quote form](Devis%20Transitaires.html#L438) | Tabs, page rendering, form input, live recalculation |
| [Validation and quote save](Devis%20Transitaires.html#L594) | Save-time errors, warnings, snapshots and persistence |
| [History and quote details](Devis%20Transitaires.html#L634) | Archive operations, payment groups, read-only quote view |
| [Offer comparison](Devis%20Transitaires.html#L703) | All-offer comparison table, sorting and filters |
| [Tariff editor](Devis%20Transitaires.html#L725) | Tariff CRUD and field validation |
| [Departure calendar](Devis%20Transitaires.html#L745) | Published departure CRUD, mode isolation and past-date locking |
| [Settings and backup](Devis%20Transitaires.html#L781) | Exchange, rounding, cutoff policy, JSON export/import |
| [Guide and startup](Devis%20Transitaires.html#L832) | In-app help, theme initialization, first render |

## 1. Runtime architecture

The page uses plain browser JavaScript. The main runtime state is the mutable global `S`; view functions generate HTML strings and replace the content of `#view`. Input and click handlers update `S`, call `compute`, and render the affected view. A document-level click handler handles controls such as price-mode toggles and choosing a comparison alternative.

The main calculation function is `compute(d, p, tarifs, cal)`. Its arguments are the draft, calculation parameters, tariff list, and departure calendar. The latter three arguments default to the active global state, which lets the comparison view and save path reuse the same engine as the live quote form.

Typical live-input path:

1. `onDevisInput` reads a field identified by `data-k`, converts number fields to numbers or `null`, and updates `S.draft`.
2. Product-name changes may update the suggested category if the category has not been manually chosen.
3. `refresh` calls `compute`, updates selection and input hints, renders summary and detail cards, and restores open disclosure sections/focus where possible.
4. `persist` schedules a local-storage write after 150 ms.
5. Clicking **Enregistrer le devis** runs `checkQuote`, presents blocking errors or confirmable warnings, then writes a quote snapshot to history.

Navigation state is stored in `S.tab`. `go` updates the selected tab, replaces the view node, renders the selected page, and scrolls to the top. Replacing the view also removes view-scoped listeners from the old page. Persistent document-level listeners are installed once during startup.

## 2. Browser dependencies and external services

The implementation uses browser APIs directly:

- `localStorage` for application state and a separate key for the theme.
- Native `<dialog>` and `showModal()` for editors and confirmations.
- `Blob`, object URLs, and an anchor download for JSON export.
- `File.text()` and `JSON.parse` for JSON import.
- `crypto.randomUUID()` for payment-group IDs.
- `Intl.DateTimeFormat` and `Intl.NumberFormat` for date and number display.

The only declared external runtime resource is Google Fonts (IBM Plex Sans, IBM Plex Mono, and Schibsted Grotesk). If the font request is unavailable, CSS system fallbacks are used. There is no application API, automatic rate feed, carrier integration, analytics endpoint, or server-side storage in this file.

Use a modern browser with support for native dialogs and the APIs above. The application can be opened directly as a file, but browser persistence for `file:` URLs varies by browser and file location. A local HTTP origin is more predictable if the browser does not retain `localStorage` for the file URL.

## 3. Navigation and user-facing modules

The sidebar contains seven views:

| View | Main behavior |
| --- | --- |
| Devis | Edit one product/order draft, select a carrier offer, inspect costs and delivery dates, set a sale price, save to history |
| Historique | Search saved quotes, inspect snapshots, edit, duplicate, delete, and group shared payments |
| Comparatif | Compare compatible tariffs, optionally show incompatible ones, filter by carrier, and sort by cost/date/carrier |
| Tarifs | Search, view, add, edit, or remove carrier offers |
| Calendrier | View, add, edit, sort, or remove exact carrier/service departures; past dates are read-only |
| Paramètres | Change exchange, billing, delay, category, carrier, service, and margin options; export/import/reset data |
| Mode d’emploi | In-app user guidance |

The quote form is organized into product, transport, and sale sections. Payment date, China delivery delay/hour, billing basis, and command-level fees are placed in a disclosure section. The result view shows per-unit and whole-order amounts; the cost and alternative details are collapsible.

Responsive layout rules are embedded in the file. The desktop layout uses a sidebar and two-column content; narrower layouts collapse to a top horizontal tab bar and a single content column. The theme toggle persists independently of the business data. The tab list supports arrow keys, Home, and End; the document also includes a skip link and visible keyboard-focus styling.

## 4. Data model

### 4.1 Application state

The persisted state has these top-level fields:

| Field | Meaning |
| --- | --- |
| `params` | Exchange, billing, date-buffer, selectable-list settings, and the close-cutoff policy |
| `tarifs` | Carrier tariff records |
| `cal` | Exact departure records |
| `quotes` | Saved quote records and payment-group membership |
| `draft` | Current editable quote |
| `editing` | Quote number being edited, or `null` |
| `tab` | Last selected view |
| `paymentGroups` | Reversible shared-payment groups; added by `normAll` for older saved state |

The application storage key is `devis-transitaires-v1`. Theme is stored separately at `devis-transitaires-theme` and is not part of the JSON business-data export.

### 4.2 First-run defaults and draft fields

These values are used only when there is no usable saved state. They are editable in Paramètres and should be treated as operator-supplied assumptions, not verified exchange/carrier data.

| Parameter | Default | Meaning |
| --- | ---: | --- |
| `usd` | 4,850 | Ar per USD |
| `marge` | 0.1 | Exchange safety margin (10%) |
| `cnyUsd` | 6.54 | CNY per USD |
| `div` | 6,000 | Volumetric divisor for cm³ to kg |
| `arrP` | 0.01 | Upward kg billing increment |
| `arrV` | 0.0000000001 | Upward m³ billing increment, effectively near-exact volume |
| `dispo` | 3 | Handling days after maximum transit |
| `mAvion` | 4 | Client buffer days for non-maritime modes |
| `mMar` | 10 | Client buffer days for maritime mode |
| `dimanche` | `Non` | Shift a Sunday availability date to Monday |
| `calendarClosePolicy` | `exclude` | Exclude published dates that miss the tariff’s depot cutoff; `keep` retains them with an inline warning |

Default categories are Général, Électronique, Téléphone, Ordinateur/tablette, Aimant, Batterie, Batterie brute, Poudre/liquide, and Danger. Default carriers are Arizato, E-SOA, Importation Express, and Importation de l’Asie. Default services are Standard, Express, Normal, Fast, and Plus. Suggested markups are 10%, 20%, 30%, 50%, 75%, 100%, 150%, and 200%.

The draft is a single product repeated for a quantity; it is not a multi-line invoice.

| Field | Meaning / unit |
| --- | --- |
| `no` | Quote number, for example `DEV-0001` |
| `name` | Product name |
| `cat` | Selected product category |
| `catManual` | Whether the category has been explicitly selected/retained |
| `price` | Purchase price in CNY per product |
| `qty` | Number of identical products |
| `dims` | Three package dimensions in cm, entered as text such as `14 x 6 x 6` |
| `wt` | Packed weight in kg per product |
| `mode` | `prix`, `rapide`, or `manuel` |
| `offer` | Selected offer label when selection is manual |
| `base` | User billing basis: highest of real/volumetric, real, or volumetric |
| `pay`, `delai`, `heure` | Payment date, seller-to-depot days, and China arrival hour |
| `livCh`, `exclus`, `livFin` | Order-level fees in Ar |
| `trans` | Order-level transaction fee in CNY |
| `marge` | Markup fraction, such as `0.5` for 50% of cost |
| `pvRetenu` | Optional manual selling price in Ar per product; `null` means automatic |
| `paymentAllocation` | Shared-payment allocation metadata for a grouped quote |

`blankDraft` defaults to one unit, a two-day seller delivery, 16:00 depot arrival, a 2 CNY order transaction fee, and a 50% markup. A newly created draft carries forward the previous draft's markup, seller-delivery days, arrival hour, transaction fee, and billing basis. It uses the current date. The first-run example is prefilled with a spray product and a fixed payment date (`2026-10-10`); that example date is not automatically advanced.

### 4.3 Tariffs and calendar records

Each tariff uses the following fields:

| Field | Meaning |
| --- | --- |
| `tr`, `mode`, `svc` | Carrier, transport mode, and service |
| `cats` | Semicolon-separated accepted categories |
| `tarif`, `unit`, `cur` | Base rate, billable unit (`kg`, `pièce`, or `m³`), and currency (`Ar` or `USD`) |
| `palier`, `tarif2` | Optional volume threshold and above-threshold rate |
| `min` | Minimum billable quantity for one product |
| `dmin`, `dmax` | Minimum/maximum transit days after departure |
| `d1`, `c1`, `d2`, `c2` | Up to two weekly departure weekdays and lead-day cutoffs |
| `h` | China-side cutoff hour |
| `note` | Free-text operational caveat shown to the user |
| `base` | Optional tariff-imposed weight basis |

A calendar row has `tr`, `mode`, `svc`, `date`, and `note`. `svc` is copied from the tariff service exactly; it is never prefixed with the mode. The Service field is cleared and disabled whenever mode is Maritime, for every carrier, in both tariff and calendar editors. Maritime tariff and calendar service values are normalized to empty strings, and dates are matched by exact carrier + mode + service (empty for Maritime). Avion retains the tariff's service name, e.g. `Fast`, not `Avion Fast`; mode remains a separate field. E-SOA Maritime offers therefore display as `E-SOA | Maritime | <category>`. E-SOA Avion offers are Normal or Express.

On first load after this change, `normAll` converts legacy calendar names through their saved service mappings (or the former defaults), then removes those mappings and records `calendarServiceVersion: 4`. Conversion is idempotent and preserves calendar dates and saved quote snapshots. Old Maritime offer labels are rendered with the service-less mode label in history without rewriting the frozen quote record. Existing custom mappings are used to migrate matching entries; entries that remain ambiguous or unmatched are preserved unchanged and do not accidentally match another offer. Legacy rows without a mode acquire one only when the available data identifies a single mode; ambiguous rows remain isolated until corrected.

The embedded `SEED` contains 30 tariffs, 18 exact departure dates, 4 carriers, 5 service names, and 9 distinct categories. These are editable local defaults, not live carrier data.

### 4.4 Saved quote and payment-group records

A saved quote stores `no`, `created`, `modified`, a copied `inputs` draft, a `res` result snapshot, and the selected offer label. `res` captures display/result values such as unit and order costs, sale price, margin, selected carrier/service, exchange values, dates, and carrier note. It does not store a complete copy of the tariff table or the complete parameter object. The view is therefore a frozen result record, not a fully self-contained recalculation/audit package.

A payment group stores a UUID, display name, CNY fee, applied Ar/CNY rate, total allocated amount, total quantity, per-quote shares, creation timestamp, and the `before` copies needed to undo grouping.

## 5. Category suggestion and compatibility

`guessCat` examines the product name with ordered regular expressions. Its first match wins, in this priority order: battery cells/raw battery, battery/power bank/lithium, phone, computer/tablet, magnet, powder/liquid/cosmetic, then electronics. It does not infer Danger. If there is no match, it returns no suggestion.

The name suggestion applies only while `catManual` is false and only when the matched category exists in the configured category list. Selecting the category control sets `catManual` to true. Category compatibility itself is exact string membership after splitting the tariff's `cats` on semicolons. It is not case-insensitive and does not perform fuzzy matching.

This is a category-level filter, not a hazardous-goods rules engine. It does not inspect detailed product ingredients, batteries, dimensions, customs documents, or carrier acceptance evidence. Carrier notes are informational and do not change compatibility.

## 6. Calculation model

All transport and purchase calculations are for one product first. Command-level fees are apportioned over the quantity. The order total is then derived from the per-product values plus the original whole-order fees.

### 6.1 Exchange and purchase

Let `USD` be the configured Ar per USD, `m` the exchange safety margin as a fraction, and `CNY/USD` the configured CNY per USD:

```text
CNY-to-Ar rate = round_to_2_decimals(USD × (1 + m) ÷ (CNY/USD))
Purchase per product = purchase price in CNY × CNY-to-Ar rate
```

The CNY rate is rounded before it is used. The tariff currency `USD` is multiplied by the configured USD/Ar rate. Any non-USD tariff currency is treated as Ar by the engine; the editor only offers Ar and USD.

### 6.2 Physical quantity and billable quantity

The dimensions and weight describe one packed product. Let `L`, `W`, and `H` be cm, `P` the packed kg, and `D` the volumetric divisor:

```text
Volume per product (m³) = L × W × H ÷ 1,000,000
Volumetric weight (kg) = L × W × H ÷ D
```

The divisor defaults to 6,000. For each tariff, `compute` determines a billable quantity:

| Tariff unit / basis | Raw billable value per product |
| --- | --- |
| `m³` | Product volume |
| `pièce` | 1 |
| `kg`, forced real | Packed weight |
| `kg`, forced volumetric | Volumetric weight |
| `kg`, no forced basis | Highest of packed and volumetric weight, or the user-selected basis |

Weight is rounded upward to the configured weight step; volume is rounded upward to the configured volume step. The tariff minimum is then applied. Defaults are 0.01 kg and 0.0000000001 m³, respectively. The quantity and minimum are per product, not per whole shipment.

For a volume tariff, if the rounded billable volume is strictly greater than `palier`, the engine applies `tarif2` to the entire volume. It does not calculate a progressive rate by bands. At exactly the threshold, the base tariff remains in use.

```text
Transport per product = billable quantity × selected rate × currency conversion
```

### 6.3 Fees, unit cost, and order cost

Let `Q` be the product quantity. `livCh`, `exclus`, and `livFin` are Ar for the full order; `trans` is a CNY transaction fee for the full order.

```text
Transaction fee for order (Ar) = trans × CNY-to-Ar rate
Transaction fee per product = transaction fee for order ÷ Q
Other order fees per product = (livCh + exclus + livFin) ÷ Q

Cost per product = purchase per product
                 + transport per product
                 + transaction fee per product
                 + other order fees per product

Cost for order = cost per product × Q
```

If a quote belongs to a grouped payment, its allocated Ar share replaces the normal `trans × rate` transaction fee. If the selected tariff has no numeric rate, the transport and final costs remain unknown rather than being displayed as zero.

### 6.4 Selling price and margin

The automatic sale price is rounded upward to the next 100 Ar:

```text
Suggested price = ceil((cost per product × (1 + markup)) ÷ 100) × 100
Selected price = manual price when numeric; otherwise suggested price
Margin per product = selected price − cost per product
Order revenue = selected price × Q
Order margin = order revenue − order cost
Markup rate = margin per product ÷ cost per product
Margin share of sale price = margin per product ÷ selected price
```

The UI's margin choices are fractions of cost (for example, 50% adds half the cost), not gross-margin percentages of the sale price. A manual price of zero is allowed. Changing markup affects sale price and margin, not purchase or transport cost.

### 6.5 Offer ranking and selection

All tariffs are calculated, but only category-compatible offers enter the automatic ranking. A numeric per-product landed cost receives a cost rank; a numeric client date receives a date rank. Ties keep the original tariff-list order because the ranking tests for strictly smaller values and the first rank-1 item is selected.

| Mode | Selected offer |
| --- | --- |
| `prix` | Lowest numeric landed cost |
| `rapide` | Earliest numeric client date, falling back to cheapest if no dated offer exists |
| `manuel` | Compatible tariff whose generated label matches `draft.offer` |

An offer with no client date can still be the cheapest choice. A date-free offer cannot win the date ranking. The generated label combines carrier, mode, lowercased service, and category string; there is no independent stable tariff ID. Duplicate labels can therefore make manual selection ambiguous.

## 7. Departure and client-date calculation

The engine begins with a fractional UTC day value:

```text
Arrival at China depot = payment date + seller delivery days + arrival hour ÷ 24
Earliest eligible departure day = ceil(arrival + cutoff days − tariff cutoff hour ÷ 24)
```

Exact calendar entries must match the tariff's carrier, mode, and canonical offer-service name. If matching entries exist, they replace weekly departures; if all such dates are earlier than the cutoff, the engine returns no departure and does not fall back to weekly days. If no matching exact entries exist, it calculates the next eligible occurrence of `d1` and, when present, `d2`, then selects the earlier; the quote identifies that no published date exists for the selected offer.

`params.calendarClosePolicy` defaults to `exclude`. The strict cutoff is `ceil(arrival + cutoff days − cutoff hour / 24)`. Published dates between the arrival day and this threshold are surfaced in the quote with the date, expected depot arrival, and missed cutoff. `keep` allows one of those dates to be selected only if it is not earlier than the arrival day, and displays the same risk warning beside the retained date.

```text
Earliest arrival = departure + minimum transit days
Latest arrival = departure + maximum transit days
Availability in Tana = latest arrival + handling days
Client date = availability + air or maritime safety buffer
```

If Sunday pickup is disabled, a Sunday availability date shifts to Monday. The client safety buffer is added after this adjustment and is not checked for Sunday again. All transit and buffer values are calendar days; holidays, real delays, time-zone conversion of the input hour, and operational exceptions are not modeled.

An exact calendar departure applies to all tariffs matching the same carrier, mode, and offer service, regardless of product category. This does not retroactively alter saved quote snapshots. Editing a quote and saving it again recalculates against the current tariff and policy.

## 8. Save-time validation and warnings

Validation occurs when the user explicitly saves; live calculation remains permissive so the draft can be edited incrementally.

Blocking checks in `checkQuote` include:

- A non-empty product name.
- Integer quantity of at least one.
- Numeric purchase price greater than or equal to zero.
- Positive USD rate, CNY/USD rate, volumetric divisor, and rounding steps.
- Non-negative exchange margin, fees, and markup; a positive calculated CNY rate.
- A selected compatible tariff and a calculable unit/order cost and sale price.
- Three positive dimensions when the selected offer uses dimensions.
- Positive weight when the selected offer uses real weight.

Confirmable warnings include a missing departure or client date, a departure already in the past, and an order with negative total margin. Warnings can be acknowledged and the quote saved. Carrier caveat text is displayed but is not itself a save warning.

The calculation clamps `qty` to at least one for live math, but save validation rejects non-integer or sub-one values. Native number-input constraints supplement custom validation in some editors. The tariff editor specifically checks that at least one category is selected, minimum transit days do not exceed maximum days, and volume threshold/rate are either both present or both absent.

## 9. History, editing, and identifiers

The history view searches product name and quote number and sorts by `modified` descending. It has no client/status workflow. The quote number is generated as one greater than the largest number currently present in history, formatted as `DEV-0001`; there is no separate monotonic counter. Deleting the highest-numbered quote can therefore allow that number to be reused later.

- **View** displays the saved input and result snapshot without recalculating it.
- **Edit** loads saved inputs into the draft. The next explicit save recalculates against the current tariffs and parameters and replaces that quote record.
- **Duplicate** copies the inputs, assigns a new number, removes grouped-payment allocation, and starts an individual-fee quote.
- **Delete** uses a two-click confirmation and removes the history record.

There is no automatic quote transmission, client notification, payment status, PDF generation, print workflow, CSV history export, client contact model, or multi-product line-item editor in this HTML implementation.

## 10. Shared transaction payments

The history action **Grouper un paiement** allocates a single CNY payment fee among at least two saved, ungrouped quotes. The UI accepts a payment reference, the fee in CNY, and a common Ar/CNY rate.

`allocatePayment` converts the shared fee to integer cents, distributes the amount in proportion to each quote's quantity, and applies the largest-remainder method so the shares sum exactly to the rounded total:

```text
Total cents = round(fee CNY × Ar/CNY rate × 100)
Initial quote share = floor(total cents × quote quantity ÷ total quantity)
Remaining cents = assigned one at a time by descending fractional remainder
```

Applying a share replaces the saved transaction fee, adjusts stored order and unit cost, and recomputes sale/margin. A manually fixed sale price is retained; an automatic sale price is recalculated from the stored markup. Grouping rejects invalid quantities, already grouped records, invalid costs/margins, negative fees, non-positive rates, and unsafe integer totals. A possible resulting loss is shown for confirmation.

Grouped quotes are locked against normal editing and deletion. Dissociating a group restores the exact `before` records copied at grouping time and removes the group. The allocation uses the supplied common rate only for the shared fee; purchase and transport snapshots are not recalculated from current rates.

## 11. Tariffs and calendar maintenance

Tariffs and dates are local editable data. Editing a tariff changes future calculations, but saved quote snapshots are not retroactively recalculated. Removing a tariff similarly affects new simulations only. Tariff records do not have stable IDs; UI actions address the current array index, and manual selection uses the generated label.

Calendar entries include carrier, mode, offer service value, date, and note. The editor's service dropdown is filtered from tariff offers by selected carrier and mode; new entries must select an existing offer service, except that a service-less offer uses an empty value. The quote and calendar therefore use the same service value directly. Existing unmapped legacy names remain visible for review but must be changed to an offered service before they can be saved through the editor. Avion and Maritime are separate in both the editor and calculation key. Calendar entries in the past are preserved for reference and have edit/delete disabled. New and edited entries must not be before the current date in the `Indian/Antananarivo` timezone. The list can be sorted by date. Add a tariff before adding a departure for a new carrier/service.

In Paramètres, operators choose whether close published dates are excluded or retained. Exclusion is the default and recommended choice. The guide explains the risk of retaining a departure after its China-side cutoff.

## 12. Persistence, export, and import

Most state changes call `persist`, which debounces a `localStorage.setItem` by 150 ms. Exceptions from this routine are swallowed, so a failed automatic write may not be visible to the user. Shared-payment commits are different: `commitPaymentState` writes synchronously and reports failure before assigning the new state.

JSON export serializes the complete `S` state, including drafts, tariffs, calendar, quotes, and payment-group undo records. It does not export the separately stored theme. Import parses a selected JSON file, checks only that `params` and `tarifs` are present, then normalizes a few legacy fields and replaces the state. Import is not a strict schema validator and does not merge with the current state. Reset removes the application-state key and reloads the page; it does not clear the separate theme key.

Keep exported backups if the browser profile or file URL may change. There is no automatic cloud backup or cross-device synchronization.

## 13. Rendering, accessibility, and security notes

The application builds views with template strings and assigns them through `innerHTML`. A shared `esc` helper escapes `&`, `<`, `>`, double quotes, and apostrophes for dynamic text in many rendering paths. Dynamic HTML generation remains a maintenance-sensitive boundary: any new user-controlled interpolation should be escaped, and URL/attribute contexts require context-appropriate handling.

The app provides semantic labels, selected/pressed states, tab-panel relationships, keyboard navigation for tabs, focus-visible styles, dialog labels, live status/error regions, and focus restoration for many dialogs. Most controls are native HTML inputs/buttons/selects. The `<html>` language is set to French at startup.

Styles are inline and layered across multiple style blocks. CSS custom properties define colors, typography, surfaces, borders, and states. Dark mode follows the system preference unless the user has a stored explicit theme. Reduced-motion preferences are respected for the short transitions used by buttons and inputs.

## 14. Known technical limitations and maintenance risks

1. **Local-only data:** browser storage is not a backup, and most storage failures are silently ignored by debounced persistence.
2. **Snapshot completeness:** saved results preserve displayed values but not the full tariff and parameter inputs required for an independent exact replay.
3. **Tariff identity:** tariff choices use labels and array positions; duplicate offer labels remain ambiguous. Calendar lookup uses carrier, mode, and the canonical offer-service name; an offer-service rename requires updating its calendar entries.
4. **Exact category matching:** compatibility is a string match, so renamed, differently cased, or misspelled categories can silently make an offer incompatible.
5. **Business-rule scope:** no live exchange data, carrier verification, customs engine, holiday calendar, volumetric policy negotiation, or proof of product admission.
6. **Volume pricing:** the above-threshold price applies to all billed volume, not incrementally by band.
7. **One-product model:** one set of dimensions and weight is repeated for the full quantity; mixed packages and a partial final carton are not modeled.
8. **Date simplification:** weekly and exact dates are calendar-day arithmetic; only availability Sunday is shifted, and exact calendars suppress weekly fallback when exhausted.
9. **Import validation:** imported JSON is only minimally shape-checked before assignment; malformed but parseable state may break rendering/calculation.
10. **Number reuse:** quote IDs are derived from the current maximum history ID rather than a persistent counter.

## 15. Verification available in this workspace

The workspace includes focused Node scripts that read the standalone HTML directly:

- `scripts/check-devis-ui.cjs` compiles the embedded script, launches Playwright/Edge, exercises the main UI and persistence paths, checks 390/768/1440 px overflow, and writes `devis-desktop.png` and `devis-mobile.png` in the workspace. Its Playwright and Edge paths are machine-specific in the current script.
- `scripts/check-payment-groups.cjs` executes the embedded calculation/payment functions in a VM and checks weighted fee distribution, cent reconciliation, restoration-related invariants, validation, and warning cases.
- `scripts/check-payment-ui.cjs` and `scripts/check-transaction-fees.cjs` provide additional focused checks for payment and transaction-fee behavior.

These are repository scripts rather than a test suite configured by the standalone HTML. Run them with Node from the workspace root when their local browser/runtime prerequisites are installed. UI checks may create screenshot artifacts.

## 16. Change checklist

When changing calculation behavior:

1. Update `compute` and any related validation in `checkQuote` together.
2. Check both per-product and whole-order values, including transaction-fee allocation.
3. Cover threshold equality, absent rates/dates, rounding, offer-service/mode isolation, close-cutoff policy, and calendar exhaustion in a focused script.
4. Verify saved quote snapshots and grouped-payment undo behavior are still coherent.
5. Exercise the browser UI at desktop and mobile widths if markup or layout changed.

When changing persisted fields, update `blankDraft`, `exampleDraft` where applicable, `norm`/`normAll`, export/import assumptions, save snapshots, and historical display together.

## 17. Quote workflow (statuses, operations, stock)

Source of truth: the block titled "SUIVI DES DOSSIERS" in the HTML file, placed before the state loader so `normAll` can use it. It holds the status list, the transition table (`STATUS_NEXT`), the reception branch by destination (`RECEPTION_BRANCH`), the actual-date chain (`ACTUAL_DATES`), the planned-date fields (`PLANNED_DATES`), and the pure rules: `transitionError`, `applyTransition`, `receptionError`, `buildExpense`, `buildStockEntry`, `quoteActionBlock`, `quoteIsStale`. These functions do not touch the DOM or `S`.

Each saved quote keeps `inputs` and `res` unchanged (the initial quote). Operational data is stored beside them on the same record: `status`, `destination`, `statusHistory`, `dateHistory`, `estimates` (figées at confirmation), `logistics`, `order`, `client`, `delivery`, `expenses`, `receptions`, `incidents`, `revisions`, `cancellation`, `needsStatusReview`. The state also has `stock` (one entry per quote, created once).

Rules:
- Only Brouillon quotes can be edited, grouped, or deleted. Confirmed quotes are locked; "Réviser" (before the Chinese order) keeps the previous version in `revisions`.
- Cancellation is allowed from Brouillon, Confirmé, Commandé en Chine and En transit; it never deletes data.
- Receptions are cumulative (partial deliveries allowed); missing = ordered − received; accepted + damaged ≤ received.
- Stock entry is created in the same state commit as the transition to "Stock boutique", and only if none exists for the quote.
- Old saved quotes without a status are set to Brouillon with `needsStatusReview: true`; they can be corrected manually. Migration is idempotent.
- Shared expenses: each quote records only its share, pro rata to ordered pieces (same principle as shared payments). The app does not split an expense across quotes automatically.

Tests: `scripts/check-workflow.cjs` (rules, migration, immutability) and `scripts/check-workflow-ui.cjs` (full browser path, double click, reload, client branch).
