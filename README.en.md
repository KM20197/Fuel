# Fuel — Fuel Economy Calculator with refuelling history

**Computing system for estimating and comparing the operational cost of fuels using a refuelling history, usage conditions and parametrized effective prices.**

| | |
|---|---|
| **Author** | Ricardo Coutinho Mello (GitHub: [KM20197](https://github.com/KM20197)) |
| **Version** | 1.1.0 (internal: versionCode 3 / versionName 3.0.0) |
| **License** | [Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/) |
| **Repository** | https://github.com/KM20197/Fuel |
| **DOI** | *10.5281/zenodo.22918209* |
| **Languages** | UI in Brazilian Portuguese |

This is a Portuguese-language application; the current document is the English abstract and reference.

## Purpose and differentiation

The app does not just compare prices per litre. It integrates three components:

1. **Longitudinal acquisition and treatment of refuelling records** — history ordered by date/time (odometer as tie-breaker), optional full-tank records, per-record usage conditions, and full retention of history even when an interval is excluded from the calculation.
2. **Consumption estimation under interval-consistency rules** — tank-to-tank method: the interval is attributed to the fuel of the preceding refuelling; partial refuelling, gasoline/ethanol switch, invalid odometer, missing litres and manual exclusions are handled through explicit labels (`no ref.`, `partial`, `partial ref.`, `fuel switch`, `excluded`, `no km`, `invalid km`, `no litres`).
3. **Economic decision using observed consumption and usage conditions** — lowest effective cost per km (R$/km), with cost per 100 km, tank cost, range, monthly cost, maximum-price band per scenario, and a usage-condition index.

## Methodological summary

- **Effective price:** station/payment scenarios — Baratão Pix is the reference; Shell, Baratão Cartão and Outros are derived through discount factors; individual overrides are supported.
- **Consumption:** `km between refuellings ÷ litres`, conditional on a full tank; the value used for the main calculation is the last valid consumption of the group (gasoline or ethanol); the aggregate mean and the mean of the last 3 are reference only.
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
docs/                       Technical description, contribution memorial, guides (Zenodo/INPI)
```

## Building the APK

```bash
# Local (JDK 17):
gradle assembleDebug          # or: ./gradlew assembleDebug
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
  version = {1.1.0},
  url = {https://github.com/KM20197/Fuel},
  note = {CC BY-NC 4.0; Zenodo DOI <DOI>}
}
```
See also `CITATION.cff` (Citation File Format v1.2.0).

## License

Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) — attribution required; **commercial use prohibited**. Full text in `LICENSE`. It is neither an OSI licence for source code nor an assignment of ownership; INPI registration and authorship remain with Ricardo Coutinho Mello.
