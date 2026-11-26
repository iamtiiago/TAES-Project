# SmartPantry

## Sous-Chef (US12)

Na pasta `smartpantry`, copia `.env.example` para `.env` e preenche `GEMINI_API_KEY` com a chave da Gemini Developer API. O servidor usa `gemini-3.5-flash-lite` por omissão. Podes indicar outro modelo Flash disponível no projeto Google da equipa em `GEMINI_MODEL`. [Modelos Gemini](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite)

Se a Gemini indicar que o projeto não tem acesso ao escalão gratuito, usa uma chave de um projeto elegível. Para continuar com o mesmo projeto, é preciso ativar a faturação no Google AI Studio. [Acesso ao escalão gratuito](https://aistudio.google.com/docs/troubleshooting#free-tier-unavailable)

Executa `npm install` e `npm run dev`. Com um perfil ativo e alimentos dentro da validade na despensa, abre **Receitas → Sous-Chef** e seleciona **Sugerir receita com sobras**. As sugestões que guardares ficam disponíveis no livro de receitas e na exportação JSON.

`POST /api/recipe-suggestion` é executado no servidor com `npm run dev` ou `npm run preview` após `npm run build`. A chave é lida no servidor e deve ser configurada como `GEMINI_API_KEY`. Para correr a aplicação num alojamento estático, disponibiliza também a rota através de uma função de servidor no mesmo domínio.

## Testes de perfil inicial, despensa e Sous-Chef

Na pasta `smartpantry`, corre `npm test` para executar os testes unitários e de integração. Para executar os cenários BDD no Katalon Studio, abre o projeto `katalon/TAES Project` e seleciona o caso de teste correspondente.

- **US01 - Configurar o perfil inicial**, **US05 - Adicionar alimentos manualmente** e **US07 - Atualizar e remover alimentos** usam `npm run dev` na porta 5173.
- **US12 - Sous-Chef** usa `npm run test:katalon` na porta 5174. Esse servidor usa respostas simuladas da Gemini e dispensa uma chave real.

### US10 - Código de barras

A implementação está na branch TP-60. Depois de `git fetch origin`, corre `npm run test:barcode` para os testes unitários ou `npm run test:katalon:barcode` para abrir a versão da US10 na porta 5175. Os comandos usam uma cópia temporária da revisão que introduziu o leitor. Para testar outra revisão da funcionalidade, passa-a depois de `--`.

No Katalon Studio, executa **US10 - Adicionar produtos por codigo de barras** com o Chrome. O teste simula a câmara e o Open Food Facts, e o leitor ZXing descodifica um código EAN-13 durante a execução.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
