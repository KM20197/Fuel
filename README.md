# Calculadora de Combustível — APK com conteúdo embutido

Projeto Android nativo que abre a calculadora diretamente dos arquivos incluídos no APK. O aplicativo não depende do GitHub Pages, de CDN, de fontes externas nem de conexão com a internet para iniciar ou calcular.

## O que está incluído

- Interface, estilos, fórmulas, ícones e dados iniciais em `app/src/main/assets/www/`.
- Histórico, configurações e cálculos persistidos localmente pelo WebView.
- Importação de CSV pelo seletor de arquivos do Android.
- Exportação de CSV pelo seletor de destino do Android, permitindo escolher Arquivos, Google Drive ou outro provedor instalado.
- Nenhuma permissão `INTERNET` no manifesto do aplicativo.

## Organização das telas

- **Calculadora:** decisão resumida, entradas principais, preços, descontos, consumos manuais, decisão automática, faixa de preço e histórico de cálculos.
- **Resultados atuais:** consumo efetivamente usado, comparação econômica atual e regra dos 70% com margem de segurança.
- Demais telas: Histórico, Simulação E25–E35, Análise por Condição, Legendas e Metodologia.

## Descontos

- Baratão: **4,93%**.
- Shell: **5,45%**.
- A seleção é exclusiva: Nenhum, Baratão ou Shell.
- O desconto selecionado é aplicado aos quatro preços informados na bomba.
- Fórmula: `preço efetivo = preço da bomba × (1 − desconto)`.
- Os dois percentuais continuam editáveis no aplicativo e são armazenados no aparelho.

## Gerar o APK

1. Abra esta pasta no Android Studio.
2. Aguarde a sincronização do Gradle. O projeto usa Android Gradle Plugin 8.7.3, JDK 17 e SDK 35.
3. Para teste, use **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. O APK de teste será criado em `app/build/outputs/apk/debug/app-debug.apk`.
5. Para distribuição, configure sua chave e gere um APK ou Android App Bundle assinado pelo menu **Build > Generate Signed Bundle / APK**.

O acesso à internet pode ser necessário na primeira sincronização do projeto para baixar ferramentas de compilação. Depois de gerado, o APK funciona sem internet porque todo o conteúdo de execução está incorporado.
