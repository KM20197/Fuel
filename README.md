# Fuel — Calculadora de Combustível com histórico de abastecimentos
<img width="193" height="20" alt="image" src="https://github.com/user-attachments/assets/4f120d1e-a290-40e4-bb92-da011e34560c" />


**Sistema computacional para estimativa e comparação do custo operacional de combustíveis a partir de histórico de abastecimentos, condições de uso e preços efetivos parametrizados.**

| | |
|---|---|
| **Autor** | Ricardo Coutinho Mello (GitHub: [KM20197](https://github.com/KM20197)) |
| **Versão** | 1.1.0 (código interno: versionCode 3 / versionName 3.0.0) |
| **Licença** | [Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/) |
| **Repositório** | https://github.com/KM20197/Fuel |
| **DOI** | [*10.5281/zenodo.22918209*])|
| **Idiomas** | Português (BR) / interface em pt-BR |

> **English abstract.** Native Android application and PWA for refuelling-history-based estimation of fuel operating cost per kilometre: longitudinal acquisition and treatment of refuelling records, tank-to-tank consumption estimation under interval-consistency rules (full-tank intervals, partial refuelling, gasoline/ethanol switch, invalid odometer, manual exclusion), and an economic decision by lowest effective cost per km using observed consumption, parametrized prices across station/payment scenarios (Baratão Pix as reference, with Shell, Baratão Cartão and Outros derived from discount factors), a maximum-price band, and a usage-condition index (congestion, gradients, air conditioning — weights 0.40/0.35/0.25) whose estimated influence is applied only when historical data are sufficient (≥3/≥5/≥12 observations and ≤70% concentration). The APK embeds the full UI, logic, styles, icons and initial data and runs offline with local persistence (localStorage) and CSV/JSON interchange.

## Finalidade e diferenciação

O aplicativo não compara apenas preços por litro. Ele integra três componentes:

1. **Aquisição e tratamento longitudinal de abastecimentos** — histórico ordenado por data/hora (com desempate por hodômetro), tanque cheio opcional, condições de uso por registro e manutenção integral do histórico mesmo quando um intervalo é excluído do cálculo.
2. **Estimação do consumo por regras de consistência dos intervalos** — método tanque a tanque: o intervalo é atribuído ao combustível do abastecimento anterior; abastecimentos parciais, trocas entre gasolina e etanol, hodômetro inválido, falta de litros e exclusões manuais são tratados como rótulos explícitos (`sem ref.`, `parcial`, `ref. parcial`, `troca comb.`, `excluído`, `sem km`, `km inválido`, `sem litros`).
3. **Decisão econômica usando consumo observado e condições de uso** — menor custo efetivo por km (R$/km), com custo por 100 km, custo do tanque, autonomia, custo mensal, faixa de preço máxima por cenário e índice de condição de uso.

## Como calcular (resumo metodológico)

- **Preço efetivo:** cenários de posto e forma de pagamento — Baratão Pix é a referência; Shell, Baratão Cartão e Outros derivam por fatores de desconto; cada cenário pode ter sobrescritas individuais.
- **Consumo:** `km entre abastecimentos ÷ litros`, condicionado a tanque cheio; o consumo usado no cálculo principal é o último consumo válido do grupo (gasolina ou etanol); média agregada e média dos 3 últimos ficam como referência.
- **Decisão:** combustível com menor `preço efetivo ÷ consumo`.
- **Faixa de preço:** teto por cenário para cada combustível permanecer o mais econômico, dados os concorrentes.
- **Índice de condição de uso (IC):** `IC = 100 × (0,40·C + 0,35·A + 0,25·AC)`, com C e A normalizados de 1–5 para 0–1; classifica em Favorável / Intermediária / Severa. O IC **não altera** o consumo observado.
- **Influência estimada da condição:** consumo por condição (`Σkm ÷ Σlitros`) e penalidade relativa à condição Favorável; o consumo ajustado é aplicado somente com dados suficientes (exploratória ≥ 3 consumos; "baseada no histórico" ≥ 5 por condição, ≥ 12 no grupo e nenhuma condição acima de 70 %). Associação observada, **não causalidade**.

## Execução e privacidade

- **PWA:** `index.html`, `manifest.json` e `service-worker.js`; funciona off-line quando servido por HTTPS; nenhuma dependência de CDN.
- **Android:** aplicativo nativo (`MainActivity.java`) que carrega `file:///android_asset/www/index.html`; **sem permissão `INTERNET`** no manifesto; tudo é executado e persistido localmente; importação/exportação de CSV via seletor do Android e backup/restauração em JSON.
- **Persistência:** `localStorage` com gravação transacional (reversão em falha parcial) e quarentena de registros corrompidos.

## Estrutura do repositório

```
app/                        Aplicação Android (Gradle; package br.com.combustivel.hondacity)
  src/main/assets/www/      Aplicação web empacotada no APK
  src/main/java/.../        MainActivity.java, AndroidBridge
.github/workflows/build.yml Compilação do APK em CI (GitHub Actions)
index.html, manifest.json, service-worker.js   PWA
README.md, LICENSE, CITATION.cff, .zenodo.json
docs/                       Descrição técnica, memorial e guias (Zenodo/INPI)
```

## Build do APK

```bash
# Local (JDK 17):
gradle assembleDebug          # ou: ./gradlew assembleDebug
# Saída: app/build/outputs/apk/debug/app-debug.apk
```
Ou use a Action **Android CI** do repositório (artefato `app-debug`).

## Como citar

```bibtex
@software{Mello_Fuel_2026,
  author = {Mello, Ricardo Coutinho},
  title = {Fuel --- Sistema computacional para estimativa e comparação do custo
           operacional de combustíveis a partir de histórico de abastecimentos,
           condições de uso e preços efetivos parametrizados},
  year = {2026},
  version = {1.1.0},
  url = {https://github.com/KM20197/Fuel},
  note = {Licença CC BY-NC 4.0; DOI Zenodo em 10.5281/zenodo.10.5281/zenodo.22918209}
}
```
Consulte também `CITATION.cff` (formato Citation File Format v1.2.0).

## Licença

Este software está licenciado sob a **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** — atribuição obrigatória e **proibição de uso comercial**. Texto integral em `LICENSE`. Não se trata de licença OSI para código-fonte nem de cessão de titularidade; o registro no INPI e a autoria permanecem com Ricardo Coutinho Mello.
