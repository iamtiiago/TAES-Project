# SmartPantry

## Sous-Chef (US12)

Na pasta `smartpantry`, copia `.env.example` para `.env` e preenche `GEMINI_API_KEY` com a chave da Gemini Developer API. O servidor usa `gemini-3.5-flash-lite` por omissão. Podes indicar outro modelo Flash disponível no projeto Google da equipa em `GEMINI_MODEL`. [Modelos Gemini](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite)

Se a Gemini indicar que o projeto não tem acesso ao escalão gratuito, usa uma chave de um projeto elegível. Para continuar com o mesmo projeto, é preciso ativar a faturação no Google AI Studio. [Acesso ao escalão gratuito](https://aistudio.google.com/docs/troubleshooting#free-tier-unavailable)

Executa `npm install` e `npm run dev`. Com um perfil ativo e alimentos dentro da validade na despensa, abre **Receitas → Sous-Chef** e seleciona **Sugerir receita com sobras**. As sugestões que guardares ficam disponíveis no livro de receitas e na exportação JSON.

`POST /api/recipe-suggestion` é executado no servidor com `npm run dev` ou `npm run preview` após `npm run build`. A chave é lida no servidor e deve ser configurada como `GEMINI_API_KEY`. Para correr a aplicação num alojamento estático, disponibiliza também a rota através de uma função de servidor no mesmo domínio.

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
