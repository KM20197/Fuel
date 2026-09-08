# Calculadora de Combustível — pacote para GitHub Pages + APK

Este pacote contém a calculadora já preparada como PWA (Progressive Web App):

- `index.html` — o app (idêntico ao HTML entregue antes, com manifest e service worker ligados).
- `manifest.json` — nome, ícone e cores do app.
- `service-worker.js` — cache básico para funcionar offline.
- `icon-192.png`, `icon-512.png` — ícones do app.

## 1. Subir para o GitHub

**Pelo site (mais simples):**
1. Abra o repositório no navegador, logado na conta dona dele.
2. "Add file" → "Upload files".
3. Arraste os 5 arquivos deste pacote para a raiz do repositório (ou para uma subpasta, ex. `/docs`, se preferir).
4. Escreva uma mensagem de commit e confirme.

**Pelo terminal:**
```bash
git clone https://github.com/KM20197/HondaFuel.git
cd HondaFuel
cp /caminho/para/index.html /caminho/para/manifest.json /caminho/para/service-worker.js \
   /caminho/para/icon-192.png /caminho/para/icon-512.png .
git add index.html manifest.json service-worker.js icon-192.png icon-512.png
git commit -m "Calculadora com gasolina comum, desconto Baratão/Shell e suporte a PWA/APK"
git push origin main
```

## 2. Publicar com GitHub Pages (URL pública grátis, necessária para gerar o APK)

No repositório: **Settings → Pages → Source → Deploy from a branch → branch `main`, pasta `/ (root)`** (ou `/docs`, se você colocou os arquivos lá) → Save.

Em alguns minutos o app fica em algo como:
`https://km20197.github.io/HondaFuel/`

## 3. Gerar o APK

### Opção A — PWABuilder (sem programar)
1. Acesse **pwabuilder.com**.
2. Cole a URL do GitHub Pages e deixe ele analisar o site.
3. Vá na aba **Android** → gere o pacote (APK ou AAB assinável).
4. Baixe e instale no celular (ative "Instalar de fontes desconhecidas" para testar antes de publicar na Play Store).

### Opção B — Capacitor (mais controle, precisa de Node.js e Android Studio)
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Calculadora de Combustível" "com.km20197.hondafuel"
mkdir www && cp index.html manifest.json service-worker.js icon-192.png icon-512.png www/
npx cap add android
npx cap sync android
npx cap open android
```
No Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

### Opção C — Bubblewrap / Trusted Web Activity (Google, via linha de comando)
Necessita do app já publicado como PWA válido (feito no passo 2). Veja: `github.com/GoogleChromeLabs/bubblewrap`.
