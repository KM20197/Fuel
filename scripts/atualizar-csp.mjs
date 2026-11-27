// Atualiza o hash SHA-256 do script inline na CSP de index.html.
// Executar após qualquer alteração no bloco <script> (npm run csp). O teste "CSP" falha se o hash estiver desatualizado.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const file = path.resolve(import.meta.dirname, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('Bloco <script> não encontrado.');
const hash = 'sha256-' + crypto.createHash('sha256').update(m[1], 'utf8').digest('base64');
const cspRe = /script-src 'self' 'sha256-[^']+';/;
if (!cspRe.test(html)) throw new Error("Diretiva script-src com hash não encontrada na CSP.");
html = html.replace(cspRe, `script-src 'self' '${hash}';`);
fs.writeFileSync(file, html, 'utf8');
console.log('CSP atualizada:', hash);
