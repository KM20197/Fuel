# Fuel — Fuel Economy Calculator with refuelling history

**Computing system for estimating and comparing the operational cost of fuels using a refuelling history, usage conditions and parametrized effective prices.**

| | |
|---|---|
| **Author** | Ricardo Coutinho Mello (GitHub: [KM20197](https://github.com/KM20197)) |
| **Version** | 1.2.0 (internal: versionCode 5 / versionName 3.1.0) |
| **License** | [Licença MIT](https://opensource.org/license/mit) |
| **Repository** | https://github.com/KM20197/Fuel |
| **DOI** | *10.5281/zenodo.22918209* |
| **Languages** | UI in Brazilian Portuguese |

This is a Portuguese-language application; the current document is the English abstract and reference.

## Purpose and differentiation

The app does not just compare prices per litre. It integrates three components:

1. **Longitudinal acquisition and treatment of refuelling records** — history ordered by date/time (odometer as tie-breaker), optional full-tank records, per-record usage conditions, and full retention of history even when an interval is excluded from the calculation.
2. **Consumption estimation under interval-consistency rules** — tank-to-tank method: the interval is attributed to the fuel of the preceding refuelling; partial refuelling, invalid odometer, missing litres and manual exclusions are handled through explicit labels (`no ref.`, `partial`, `partial ref.`, `excluded`, `no km`, `invalid km`, `no litres`). Gasoline/ethanol switches no longer exclude the interval: the tank composition is the volume-weighted mean of the residual (capacity − litres added; neglected below 5 % of capacity) and the refuelling, and the interval's km and litres are split between gasoline and ethanol in proportion to each group in the tank (`mix`). The ethanol content of each gasoline refuelling feeds the *Ethanol-equivalent litres* field and the performance layer by ethanol-content band (editable limits; own data-sufficiency criteria). Before the first record the tank is assumed to be 100 % gasoline with the "current ethanol in gasoline" content.
3. **Economic decision using observed consumption and usage conditions** — lowest effective cost per km (R$/km), with cost per 100 km, tank cost, range, monthly cost, maximum-price band per scenario, and a usage-condition index.

## Methodological summary

- **Effective price:** station/payment scenarios — Baratão Pix is the reference; Shell, Baratão Cartão and Outros are derived through discount factors; individual overrides are supported.
- **Consumption:** `km between refuellings ÷ litres`, conditional on a full tank; the value used for the main calculation is Σkm ÷ Σlitros over the last 3 valid consumptions of the group (partial refuellings are summed into the next full tank; when the partial is a different fuel, the consumed share of each fuel is estimated from the average of the tank composition at the start and at the end of the interval, with the volume before a partial assumed to be capacity minus the partial's litres; intervals above 40 km/L gasoline or 30 km/L ethanol are excluded as implausible) (gasoline or ethanol) in which that group made up at least 50 % of the tank; the aggregate mean and the mean of the last 3 are reference only.
- **Decision:** fuel with the lowest `effective price ÷ consumption`.
- **Price band:** per-scenario ceiling for each fuel to remain the cheapest, given the competitors.
- **Usage-condition index (IC):** `IC = 100 × (0.40·C + 0.35·A + 0.25·AC)`, with C and A normalized from 1–5 to 0–1; classified as Favourable / Intermediate / Severe. IC never changes observed consumption.
- **Estimated condition influence:** consumption per condition (`Σkm ÷ Σlitres`) and penalty relative to the Favourable condition; the adjusted consumption is applied only when data are sufficient (exploratory ≥ 3 consumptions; "history-based" ≥ 5 per compared condition, ≥ 12 in the group and ≤ 70% concentration). Observed association, **not causality**.

## Execution and privacy

- **PWA:** `index.html`, `manifest.json`, `service-worker.js`; runs offline when served over HTTPS; no CDN dependency.
- **Android:** native app (`MainActivity.java`) loading `file:///android_asset/www/index.html`; **no `INTERNET` permission**; everything runs and persists locally; CSV import/export via Android pickers and JSON backup/restore.
- **Persistence:** `localStorage` with transactional writes (rollback on partial failure) and quarantine of corrupted records.

## Repository structure

```
app/                        Android application (Gradle; package br.com.combustivel.hondacity)
  src/main/assets/www/      Web app embedded in the APK
  src/main/java/.../        MainActivity.java, AndroidBridge
.github/workflows/build.yml CI APK build (GitHub Actions)
index.html, manifest.json, service-worker.js   PWA
README.md, LICENSE, CITATION.cff, .zenodo.json
```

## Building the APK

```bash
# Local (JDK 17):
gradle assembleDebug          # requires Gradle 8.9 installed (the repository has no gradlew)
# Output: app/build/outputs/apk/debug/app-debug.apk
```
Or use the repository's **Android CI** action (artifact `app-debug`).

## Citation

```bibtex
@software{Mello_Fuel_2026,
  author = {Mello, Ricardo Coutinho},
  title = {Fuel --- Computing system for estimating and comparing the operational
           cost of fuels using a refuelling history, usage conditions and
           parametrized effective prices},
  year = {2026},
  version = {1.2.0},
  url = {https://github.com/KM20197/Fuel},
  note = {MIT; Zenodo DOI 10.5281/zenodo.22918209}
}
```
See also `CITATION.cff` (Citation File Format v1.2.0).

## License

MIT — attribution required. Full text in `LICENSE`.
