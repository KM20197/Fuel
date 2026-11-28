import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ler = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const gradle = ler('app/build.gradle');
const versionName = gradle.match(/versionName\s+'([^']+)'/)[1];
const versionCode = gradle.match(/versionCode\s+(\d+)/)[1];
const cff = ler('CITATION.cff');
const zenodo = JSON.parse(ler('.zenodo.json'));
const versaoPublica = zenodo.version;

test('M1: versão pública igual em .zenodo.json, CITATION.cff e READMEs', () => {
  const versoesCff = [...cff.matchAll(/^\s*version: "([^"]+)"/gm)].map((m) => m[1]);
  assert.ok(versoesCff.length >= 1);
  versoesCff.forEach((v) => assert.equal(v, versaoPublica));
  assert.match(ler('README.md'), new RegExp(`\\| \\*\\*Versão\\*\\* \\| ${versaoPublica.replace(/\./g, '\\.')} `));
  assert.ok(ler('README.md').includes(`version = {${versaoPublica}}`));
  assert.ok(ler('README.en.md').includes(`version = {${versaoPublica}}`));
});

test('M2: versionCode e versionName do APK constam nos READMEs e no User-Agent', () => {
  const marca = `versionCode ${versionCode} / versionName ${versionName}`;
  assert.ok(ler('README.md').includes(marca));
  assert.ok(ler('README.en.md').includes(marca));
  assert.ok(ler('app/src/main/java/br/com/combustivel/hondacity/MainActivity.java')
    .includes(`CalculadoraCombustivelAPK/${versionName}`));
});

test('M3: licença MIT consistente e sem marcadores de modelo', () => {
  const lic = ler('LICENSE');
  assert.match(lic, /Copyright \(c\) 2026 Ricardo Coutinho Mello/);
  assert.ok(!/[<>]/.test(lic.split('\n')[0]));
  assert.equal(zenodo.license, 'MIT');
  assert.match(cff, /^license: MIT/m);
  assert.ok(!/Creative Commons|CC BY/i.test(zenodo.description));
  assert.ok(!/Creative Commons|CC BY/i.test(ler('README.md')));
});

test('M4: release.yml usa o Gradle Wrapper (compatível com o AGP) e executa testes', () => {
  const rel = ler('.github/workflows/release.yml');
  assert.ok(!/gradle-version/.test(rel));
  assert.ok(!/run:\s*gradle\s/.test(rel));
  assert.ok(rel.includes('./gradlew assembleRelease'));
  assert.ok(rel.includes('testDebugUnitTest'));
});

test('M5: build.yml declara permissions e ignora a assinatura sem Secrets em pull requests', () => {
  const b = ler('.github/workflows/build.yml');
  assert.match(b, /^permissions:\s*\n\s+contents: read/m);
  assert.ok(b.includes("steps.assinatura.outputs.disponivel == 'true'"));
});

test('M6: workflows são YAML válido (o release.yml anterior não era)', () => {
  const b = ler('.github/workflows/build.yml');
  assert.ok(b.includes('js-yaml@4.1.0'));
  assert.ok(ler('.github/workflows/release.yml').includes('run: |'));
});
