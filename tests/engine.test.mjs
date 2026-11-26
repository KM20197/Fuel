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
