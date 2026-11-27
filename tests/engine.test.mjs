import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function createHarness(initialStorage = {}) {
  const store = new Map(Object.entries(initialStorage));
  const elements = new Map();

  const makeEl = (id) => ({
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    elements: {},
    attributes: new Map(),
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._set.has(c)) this._set.delete(c); else this._set.add(c);
        } else if (force) this._set.add(c);
        else this._set.delete(c);
      },
      contains(c) { return this._set.has(c); },
    },
    children: [],
    parentElement: { children: [] },
    parentNode: { appendChild() {} },
    closest() { return null; },
    matches() { return false; },
    addEventListener() {},
    setAttribute(k, v) { this.attributes.set(k, String(v)); },
    getAttribute(k) { return this.attributes.get(k) ?? null; },
    removeAttribute(k) { this.attributes.delete(k); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {},
    click() {},
  });

  const getEl = (id) => {
    if (!elements.has(id)) elements.set(id, makeEl(id));
    return elements.get(id);
  };

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'Tag <script> não encontrada em index.html');

  const sandbox = {
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    Date,
    JSON,
    RegExp,
    Error,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    setTimeout: () => 0,
    clearTimeout: () => {},
    location: { protocol: 'https:', hostname: 'example.com' },
    navigator: {},
    localStorage: {
      get length() { return store.size; },
      key(i) { return Array.from(store.keys())[i] ?? null; },
      getItem(k) { return store.has(k) ? store.get(k) : null; },
      setItem(k, v) { store.set(k, String(v)); },
      removeItem(k) { store.delete(k); },
    },
    document: {
      activeElement: null,
      body: { appendChild() {}, removeChild() {} },
      getElementById: (id) => getEl(id),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => makeEl('dyn'),
      addEventListener() {},
    },
    window: {
      scrollTo() {},
      addEventListener() {},
    },
    URL: {
      createObjectURL: () => 'blob:mock',
      revokeObjectURL() {},
    },
    Blob: class { constructor(parts) { this.parts = parts; } },
  };
  sandbox.window.window = sandbox.window;

  const ctx = vm.createContext(sandbox);
  vm.runInContext(
    scriptMatch[1] +
      '\nglobalThis.__exports = { state, FUELS, CENARIOS, parseNumCampo, numeroCampoConfiguracao, parseDateForStorage, normalizarHora, protegerFormulaCSV, desprotegerFormulaCSV, parseCSVTexto, interpretarPercentualCSV, escapeHTML, idSeguro, analisarCadeia, referenciaParaLancamento, composicaoAposAbastecimento, calcularMedicoes, consumoDinamico, aplicarPrecoNoCenario, precoNoCenario, comparacaoEconomica, decisaoAutomatica, indiceCondicao, classifyUsageCondition, estimarInfluenciaCondicao, estimarInfluenciaTeor, diagnosticarHistorico, classificarModeloPrecos, loadPersisted, persist, getQuarentenaKeys: () => Array.from({length: localStorage.length}, (_,i) => localStorage.key(i)).filter(k => k.startsWith("combustivel:corrompido:")) };',
    ctx
  );
  return { ctx, api: sandbox.__exports, store };
}

test('PWA, acessibilidade e ausência de alert/confirm nativos em index.html', () => {
  assert.match(html, /<link\s+rel="manifest"\s+href="manifest\.json">/);
  assert.match(html, /navigator\.serviceWorker\.register\(['"]\.\/service-worker\.js['"]\)/);
  assert.match(html, /env\(safe-area-inset-top/);
  assert.match(html, /window\.handleAndroidBack\s*=/);
  const scriptOnly = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.equal(/\b(alert|confirm)\s*\(/.test(scriptOnly), false, 'Não deve haver alert()/confirm() nativos no script');
});

test('Parsers numéricos, datas, CSV e escape HTML', () => {
  const { api } = createHarness();
  assert.equal(api.parseNumCampo('5,25', 'decimal'), 5.25);
  assert.equal(api.parseNumCampo('1.234,56', 'decimal'), 1234.56);
  assert.equal(api.parseNumCampo('6.100', 'milhar'), 6100);
  assert.ok(Number.isNaN(api.parseNumCampo('1e3', 'decimal')));
  assert.equal(api.numeroCampoConfiguracao('39,5'), 39.5);
  assert.equal(api.numeroCampoConfiguracao('-5,2'), -5.2);

  assert.equal(api.parseDateForStorage('29/02/2024'), '2024-02-29');
  assert.equal(api.parseDateForStorage('29/02/2025'), '');
  assert.equal(api.normalizarHora('8:05'), '08:05');
  assert.equal(api.normalizarHora('25:00'), '');

  assert.equal(api.protegerFormulaCSV('=CMD()'), "'=CMD()");
  assert.equal(api.desprotegerFormulaCSV("'=CMD()"), '=CMD()');
  assert.equal(api.desprotegerFormulaCSV(api.protegerFormulaCSV("'teste")), "'teste");

  const payload = '<img src=x onerror=alert(1)>';
  assert.equal(api.escapeHTML(payload), '&lt;img src=x onerror=alert(1)&gt;');
});

test('Cadeia de hodômetro e edição com ignoreId', () => {
  const { api } = createHarness();
  const registros = [
    { id: 'a1', data: '2026-09-01', hora: '08:00', combustivel: 'gasolina_comum', preco: 5.0, hodometro: 6000, litros: 30, tanqueCheio: true, incluir: 'Sim' },
    { id: 'a2', data: '2026-09-05', hora: '08:00', combustivel: 'gasolina_comum', preco: 5.0, hodometro: 5900, litros: 20, tanqueCheio: true, incluir: 'Sim' },
    { id: 'a3', data: '2026-09-10', hora: '08:00', combustivel: 'etanol_comum', preco: 3.1, hodometro: 6360, litros: 30, tanqueCheio: true, incluir: 'Sim' },
  ];
  const cad = api.analisarCadeia(registros, 5698);
  assert.equal(cad.km.get(registros[0]), 302);
  assert.equal(cad.km.get(registros[1]), null); // hodômetro menor que 6000 -> inválido
  assert.equal(cad.km.get(registros[2]), 360);  // continua comparando com 6000 (último válido)

  api.state.historico.push(...registros);
  api.state.hodometroBaseline = 5698;
  const refEdit = api.referenciaParaLancamento('2026-09-10', '08:00', 6360, 'a3');
  assert.equal(refEdit.odometroAnterior, 6000);
  assert.equal(refEdit.proximo, null);
});

test('Cálculo de consumo, mistura no tanque e litros equivalentes de etanol', () => {
  const { api } = createHarness();
  api.state.hodometroBaseline = 5000;
  api.state.entradas.capacidadeTanque = 40;
  api.state.entradas.etanolAtual = 0.30;
  api.state.historico.push(
    { id: 'r1', data: '2026-09-01', hora: '08:00', combustivel: 'gasolina_comum', etanolPct: 0.30, preco: 5.0, hodometro: 5400, litros: 38, tanqueCheio: true, incluir: 'Sim' },
    // r2: resíduo após r1 = 40 - 38 = 2 L (5% exact -> desprezado? 2/40 = 0.05, não < 0.05; aqui r1 é gasolina e r2 é etanol com 20L -> metade/metade na saída de r2!)
    { id: 'r2', data: '2026-09-05', hora: '08:00', combustivel: 'etanol_comum', preco: 3.2, hodometro: 5800, litros: 20, tanqueCheio: true, incluir: 'Sim' },
    { id: 'r3', data: '2026-09-10', hora: '08:00', combustivel: 'etanol_comum', preco: 3.2, hodometro: 6160, litros: 36, tanqueCheio: true, incluir: 'Sim' }
  );
  api.state.historico.forEach((r, i) => {
    const prev = i === 0 ? 5000 : api.state.historico[i - 1].hodometro;
    r.km = r.hodometro - prev;
  });

  const med = api.calcularMedicoes();
  assert.equal(med.porRegistro.get('r1').motivo.curto, 'sem ref.');
  assert.equal(med.porRegistro.get('r2').mistura, false); // intervalo 2 rodou só com gasolina de r1
  assert.equal(med.porRegistro.get('r2').medicao.consumo, 20); // 400 km / 20 L
  assert.equal(med.porRegistro.get('r3').mistura, true);  // após r2, havia 20 L gasolina + 20 L etanol
  assert.equal(med.porRegistro.get('r3').partes.length, 2);
});

test('Modelo de preços e detecção de empate na decisão automática', () => {
  const { api } = createHarness();
  const rej = api.aplicarPrecoNoCenario('gasolina_comum', 2.0, 'shell');
  assert.equal(rej.aplicado, false);
  assert.equal(rej.motivo, 'shell_abaixo_pix');

  const ok = api.aplicarPrecoNoCenario('gasolina_comum', 6.0, 'shell');
  assert.equal(ok.aplicado, true);
  assert.ok(Math.abs(api.precoNoCenario('gasolina_comum', 'shell') - 6.0) < 1e-6);

  const comp = {
    gasolina_aditivada: { preco: 6.0, consumo: 12, custoKm: 0.5 },
    gasolina_comum:     { preco: 5.0, consumo: 10, custoKm: 0.5 },
    etanol_comum:       { preco: 4.0, consumo: 7,  custoKm: 4 / 7 },
    etanol_aditivado:   { preco: 4.2, consumo: 7,  custoKm: 0.6 },
  };
  const dec = api.decisaoAutomatica(comp);
  assert.equal(dec.completo, true);
  assert.deepEqual(Array.from(dec.empates), ['gasolina_aditivada', 'gasolina_comum']);
});

test('Índice de condição de uso (IC) e quarentena de armazenamento corrompido', () => {
  const { api } = createHarness({
    'combustivel:config': '{json-invalido',
    'combustivel:historico': '[]',
  });
  const restaurou = api.loadPersisted();
  assert.equal(restaurou, false);
  assert.equal(api.getQuarentenaKeys().length, 1);

  const icFav = api.indiceCondicao({ congestionamento: 1, aclives: 1, arCondicionado: 0 });
  assert.equal(icFav, 0);
  assert.equal(api.classifyUsageCondition({ congestionamento: 1, aclives: 1, arCondicionado: 0 }), 'Favorável');

  const icSev = api.indiceCondicao({ congestionamento: 5, aclives: 5, arCondicionado: 1 });
  assert.equal(icSev, 100);
  assert.equal(api.classifyUsageCondition({ congestionamento: 5, aclives: 5, arCondicionado: 1 }), 'Severa');
});

// ---- Regressões da auditoria (C1–C4, S1, S2) ----

// Preenche r.km como o app faz (recomputeKmDeltas): km do intervalo pela cadeia de hodômetro.
function carregar(api, registros, baseline = 0) {
  api.state.historico.push(...registros);
  api.state.hodometroBaseline = baseline;
  api.analisarCadeia(registros, baseline).km.forEach((valor, r) => { r.km = valor; });
}

const gas = (id, data, hora, hodometro, litros, extra = {}) =>
  ({ id, data, hora, combustivel: 'gasolina_comum', preco: 5.0, hodometro, litros, tanqueCheio: true, incluir: 'Sim', ...extra });

test('C2: hodômetro digitado a maior é retirado da cadeia e não invalida os seguintes', () => {
  const { api } = createHarness();
  const r = [
    gas('h1', '2026-09-01', '08:00', 1000, 30),
    gas('h2', '2026-09-05', '08:00', 13000, 30),   // digitado no lugar de 1300
    gas('h3', '2026-09-10', '08:00', 1500, 30),
    gas('h4', '2026-09-15', '08:00', 1800, 30),
  ];
  const cad = api.analisarCadeia(r, 0);
  assert.equal(cad.km.get(r[1]), null);   // erro retirado da cadeia
  assert.equal(cad.km.get(r[2]), 500);    // medido a partir de 1000
  assert.equal(cad.km.get(r[3]), 300);
});

test('C2: diferença sem consumo implausível não remove o lançamento anterior', () => {
  const { api } = createHarness();
  const r = [
    gas('k1', '2026-09-01', '08:00', 1000, 30),
    gas('k2', '2026-09-05', '08:00', 1300, 30),   // 10 km/L: plausível
    gas('k3', '2026-09-10', '08:00', 1100, 30),   // hodômetro menor: inválido, sem retirar k2
  ];
  const cad = api.analisarCadeia(r, 0);
  assert.equal(cad.km.get(r[1]), 300);
  assert.equal(cad.km.get(r[2]), null);
});

test('C1: intervalo com consumo acima do limite físico é excluído do cálculo', () => {
  const { api } = createHarness();
  carregar(api, [
    gas('p1', '2026-09-01', '08:00', 1000, 30),
    gas('p2', '2026-09-05', '08:00', 13000, 30) // 12 000 km com 30 L: 400 km/L
  ]);
  const { medicoes, porRegistro } = api.calcularMedicoes();
  assert.equal(porRegistro.get('p2').motivo.curto, 'km/L implausível');
  assert.equal(medicoes.length, 0);
});

test('C4: parciais do mesmo combustível são somados ao tanque cheio seguinte', () => {
  const { api } = createHarness();
  carregar(api, [
    gas('c1', '2026-09-01', '08:00', 1000, 30),
    gas('c2', '2026-09-03', '08:00', 1200, 10, { tanqueCheio: false }),
    gas('c3', '2026-09-05', '08:00', 1350, 10, { tanqueCheio: false }),
    gas('c4', '2026-09-08', '08:00', 1600, 30)
  ]);
  const { medicoes, porRegistro } = api.calcularMedicoes();
  assert.equal(porRegistro.get('c2').motivo.curto, 'parcial acum.');
  assert.equal(porRegistro.get('c3').motivo.curto, 'parcial acum.');
  assert.equal(medicoes.length, 1);
  assert.equal(medicoes[0].id, 'c4');
  assert.equal(medicoes[0].km, 600);
  assert.equal(Math.round(medicoes[0].consumo * 1000) / 1000, 12);  // 600 km ÷ (30 + 10 + 10) L
});

test('C4: parcial de outro combustível é somado e o consumo é partilhado pela composição média', () => {
  const { api } = createHarness();
  api.state.entradas.capacidadeTanque = 39.5;
  carregar(api, [
    gas('d1', '2026-09-01', '08:00', 1000, 30),                       // tanque cheio, gasolina
    { ...gas('d2', '2026-09-03', '08:00', 1200, 10, { tanqueCheio: false }), combustivel: 'etanol_comum' }, // parcial etanol
    { ...gas('d3', '2026-09-05', '08:00', 1600, 30), combustivel: 'etanol_comum' }  // tanque cheio, etanol
  ]);
  const { medicoes, porRegistro } = api.calcularMedicoes();
  assert.equal(porRegistro.get('d2').motivo.curto, 'parcial acum.');
  // km 600 (1000→1600) ÷ Σlitros 40 (10 parcial + 30 cheio) = 15 km/L
  assert.equal(medicoes.length, 2);
  medicoes.forEach(m => assert.equal(Math.round(m.consumo * 1000) / 1000, 15));
  // composição média: gasolina 1 no início e 29,5/39,5 no fim -> fração de gasolina ~0,873
  const gasolina = medicoes.find(m => m.grupo === 'gasolina');
  const etanol = medicoes.find(m => m.grupo === 'etanol');
  const fracGas = (1 + 29.5 / 39.5) / 2;
  assert.ok(Math.abs(gasolina.fracao - fracGas) < 1e-9);
  assert.ok(Math.abs(etanol.fracao - (1 - fracGas)) < 1e-9);
});

test('S1: index.html sem atributos on* e com CSP por hash, sem unsafe-inline em script-src', () => {
  const crypto = require_crypto();
  const scriptText = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const headPart = html.slice(0, html.indexOf('<script>'));
  assert.equal(/ on(click|change|input|submit)="/.test(headPart), false);
  const csp = html.match(/script-src ([^;]*);/)[1];
  assert.equal(csp.includes("'unsafe-inline'"), false);
  const hash = 'sha256-' + crypto.createHash('sha256').update(scriptText, 'utf8').digest('base64');
  assert.ok(csp.includes(`'${hash}'`), 'Hash do script inline desatualizado: execute "node scripts/atualizar-csp.mjs".');
});

test('S2: campos de condição de uso são escapados na tabela do histórico', () => {
  assert.ok(html.includes("${escapeHTML(r.congestionamento ?? '—')}"));
  assert.ok(html.includes("${escapeHTML(r.aclives ?? '—')}"));
});

function require_crypto() { return globalThis.process.getBuiltinModule('node:crypto'); }
