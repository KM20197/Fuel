# Calculadora de Combustível 

Projeto Android nativo que abre a calculadora diretamente a partir dos arquivos incluídos no APK. O aplicativo não depende do GitHub Pages, de CDN, de fontes externas nem de conexão com a internet para iniciar ou calcular.

## O que está incluído

- Interface, estilos, fórmulas, ícones e dados iniciais em `app/src/main/assets/www/`.
- Histórico, configurações e cálculos persistidos localmente pelo WebView.
- Importação de CSV pelo seletor de arquivos do Android.
- Exportação de CSV pelo seletor de destino do Android, permitindo escolher entre Arquivos, Google Drive ou outro provedor instalado.
- Nenhuma permissão `INTERNET` no manifesto do aplicativo.

## Organização das telas

- **Calculadora:** decisão resumida, entradas principais, preços, descontos, consumos manuais, decisão automática, faixa de preço e histórico de cálculos.
- **Resultados atuais:** consumo efetivamente utilizado, comparação econômica atual e regra dos 70% com margem de segurança.
- Demais telas: Histórico, Legendas e Metodologia.

O acesso à internet pode ser necessário na primeira sincronização do projeto para baixar ferramentas de compilação. Depois de gerado, o APK funciona sem internet porque todo o conteúdo de execução está incorporado.
