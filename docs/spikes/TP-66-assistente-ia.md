# TP-66 — Investigação: assistente de IA para receitas com sobras

Data: 18 de novembro de 2026

# Decisão

Usar a Gemini Developer API para gerar sugestões de receita na US12. Permite pedir uma resposta em JSON e tem escalão gratuito para desenvolvimento. A OpenAI API fica de fora nesta primeira versão porque exige créditos.

O modelo fica definido no servidor. Na implementação deve ser escolhido um modelo Flash disponível no projeto Google da equipa. O `gemini-1.5-flash` não deve ficar fixo, porque já não é uma referência atual.

# Pedido à API

Endpoint:

`POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent`

Os dados já existem no projeto:

- despensa: `name`, `quantity`, `unit` e `expirationDate`;
- perfil ativo: `servings`, `diet`, `allergies` e `excludedIngredients`.

Exemplo do conteúdo enviado pela aplicação ao serviço:

```json
{
  "ingredients": [
    { "name": "tomate", "quantity": 4, "unit": "un", "expirationDate": "2026-11-20" }
  ],
  "servings": 2,
  "diet": "vegetarian",
  "allergies": ["amendoim"],
  "excludedIngredients": ["coentros"]
}
```

A resposta esperada da API tem de incluir:

```json
{
  "title": "string",
  "servings": 2,
  "estimatedMinutes": 25,
  "ingredients": [{ "name": "string", "quantity": "string" }],
  "steps": ["string"]
}
```

Uma resposta sem título, ingredientes ou passos é rejeitada antes de chegar à interface ou de ser guardada.

# Alteração necessária no projeto

O projeto é React/Vite e não tem backend. A chave da Gemini não pode ficar no React nem numa variável `VITE_*`, porque seria visível no browser.

Antes da TP-71 tem de existir uma função de servidor, por exemplo `/api/recipe-suggestion`. A interface envia os ingredientes e o perfil para essa função; a função chama a Gemini e devolve a receita. A chave fica no ambiente do servidor como `GEMINI_API_KEY`. Também falta adicionar `.env` ao `.gitignore`.

As alergias e exclusões seguem no pedido como restrições. A receita não é uma garantia de segurança alimentar, por isso o utilizador tem de confirmar os ingredientes antes de cozinhar.
