# Calculadora de Combustível — v2 (offline-first + hodômetro + Drive manual)

## O que mudou nesta versão

- **Offline de verdade.** O service worker antigo usava `cache.addAll()` (tudo-ou-nada) e dependia do
  Google Fonts (externo). Reescrevi para cachear cada arquivo individualmente e removi a dependência
  de fontes externas — agora usa as fontes do sistema. Depois de abrir o app UMA VEZ com internet, ele
  deve continuar funcionando sem internet daí em diante.
- **Dados ficam salvos no aparelho** (localStorage): histórico de abastecimentos, configurações da
  calculadora e histórico de cálculos agora sobrevivem a fechar o app — antes, sumiam a cada sessão.
- **Hodômetro.** Em vez de digitar "km percorridos" de cabeça, você digita o hodômetro do painel e o
  app calcula sozinho a distância desde o abastecimento anterior (ordenando pelos hodômetros salvos,
  não pela ordem em que você digitou). Tem um campo opcional de "hodômetro de referência" nas
  Entradas principais, pra funcionar mesmo no primeiro lançamento.
- **Histórico de cálculos**: um botão "Salvar cálculo atual" na Calculadora grava uma foto dos preços
  e da decisão automática naquele momento — dá pra ver como a decisão mudou ao longo do tempo, e
  exportar isso em CSV separado.
- **CSV compatível com a planilha real.** Confirmei a estrutura da aba Historico da
  `Calculadora_Honda_v10_CORRIGIDA` (seu CSV real) e ajustei para bater exatamente: mesmas 11 colunas
  de entrada (`Data, Combustível, Etanol na gasolina (%), Preço (R$/L), Km percorridos, Litros
  consumidos, Congestionamento, Aclives, Ar-condicionado, Incluir no cálculo?, Observações`), mesmos
  nomes de cabeçalho, data em `DD/MM/AAAA`. O botão **"Baixar CSV (planilha)"** gera exatamente isso —
  pode colar direto na aba Historico sem quebrar as fórmulas de G a P. O botão **"Baixar CSV completo"**
  traz tudo isso mais Hodômetro/Hora/Valor total, para backup do próprio app (não colar esse na planilha).
- Importar aceita os dois formatos acima E o CSV exportado direto do Google Sheets (reconhece "R$",
  "%", "km/L" etc. e ignora linhas em branco).

## Ainda não mexi em

As abas **Config** e **Controle** da sua planilha v10 — não sei o que elas contêm exatamente. Se
quiser que eu espelhe isso no app também, me diga o que tem lá (ou exporte como CSV, igual fez com o
Historico) que eu ajusto.

## Google Drive

Continua sendo só um destino de arquivo: os botões de CSV abrem o seletor de salvar/compartilhar do
Android, onde o Google Drive aparece como opção — sem integração via API, sem login, exatamente como
você já vinha usando.

## O que fazer agora

1. Suba estes arquivos para o repositório (substituindo os antigos): `index.html`, `service-worker.js`,
   `manifest.json`, `icon-192.png`, `icon-512.png`.
2. Abra `https://km20197.github.io/Fuel/` no celular **com internet** pelo menos uma vez — isso deixa o
   novo service worker se instalar e cachear tudo.
3. Ative o modo avião e abra o app de novo (ou o APK já instalado). Deve funcionar normalmente.
4. **Você provavelmente NÃO precisa gerar um novo APK.** Se o app instalado é do tipo Trusted Web
   Activity (o que o PWABuilder gera por padrão), ele abre a mesma URL de sempre — assim que o service
   worker novo estiver instalado, o app existente passa a funcionar offline sozinho.
5. Se mesmo assim continuar falhando sem internet, aí sim vale migrar para Capacitor (empacota os
   arquivos DENTRO do APK, zero dependência do GitHub Pages a partir daí) — me avise que eu preparo
   esse projeto.

## Passo a passo original (GitHub Pages + APK)

Veja a seção correspondente na entrega anterior — nada mudou nesse processo, só o conteúdo dos arquivos.
