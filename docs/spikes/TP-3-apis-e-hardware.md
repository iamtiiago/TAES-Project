# TP-3 — Pesquisa sobre APIs e acesso à câmara

29 de outubro de 2026

Esta pesquisa foi feita para perceber como usar a câmara do telemóvel na leitura de códigos de barras e que APIs podem fornecer os dados dos produtos e das receitas. Foram consultadas as documentações e feitos pedidos às duas APIs. A câmara ainda não foi testada num dispositivo real.

## 1. Acesso à câmara

É possível aceder à câmara pelo browser com `navigator.mediaDevices.getUserMedia`. O utilizador tem de autorizar o acesso e a página precisa de HTTPS. Durante o desenvolvimento, também funciona em `localhost`, mas apenas no próprio dispositivo.

Isto tem uma consequência para os testes: abrir no telemóvel o endereço HTTP do computador, por exemplo `http://192.168.x.x:5173`, não é o mesmo que usar `localhost`. Para testar dessa forma, é necessário disponibilizar a página por HTTPS.

O pedido pode dar preferência à câmara traseira:

```js
const stream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: { facingMode: { ideal: 'environment' } },
});
```

O vídeo recebido deve ser ligado a um elemento `<video autoPlay muted playsInline>`. Ao sair do leitor, é necessário libertar a câmara:

```js
stream.getTracks().forEach((track) => track.stop());
```

Estes exemplos servem de base para a implementação; não foram executados com uma câmara nesta pesquisa. Também será preciso tratar a recusa de permissão e os casos em que a câmara não existe ou está indisponível.

### Leitura do código de barras

Ter acesso à câmara não significa que o código já esteja a ser lido. Para isso, é necessário um descodificador.

O browser pode disponibilizar `BarcodeDetector`, mas esta API ainda tem suporte limitado. Antes de a usar, é preciso verificar se existe e consultar `getSupportedFormats()` para saber se lê os formatos necessários, como EAN-13, EAN-8 e UPC-A.

Uma alternativa a avaliar é `@zxing/browser`, com `BrowserMultiFormatReader` ou `BrowserMultiFormatOneDReader`. Um leitor apenas de QR não serve para os códigos EAN das embalagens. Esta biblioteca não foi instalada nem testada.

Deve existir uma opção de introdução manual quando a leitura falhar ou o utilizador não autorizar a câmara.

Referências: [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [libertar a câmara](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop), [BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) e [ZXing Browser](https://github.com/zxing-js/browser).

## 2. Consulta de produtos — Open Food Facts

O Open Food Facts permite procurar produtos alimentares pelo código de barras, sem uma chave privada para as consultas públicas. Foi testado este endpoint:

```text
GET https://world.openfoodfacts.org/api/v3/product/{barcode}?fields=code,product_name,brands,quantity,ingredients_text,allergens_tags,traces_tags,image_front_small_url
```

O parâmetro `fields` permite pedir só os campos necessários. Neste caso: código, nome, marca, quantidade da embalagem, ingredientes, alergénios, vestígios e imagem. O código deve ser guardado como texto, para preservar possíveis zeros iniciais.

A documentação introdutória recomenda a versão 3 para novas integrações, embora o ficheiro OpenAPI ainda tenha um aviso de desenvolvimento e outra indicação de versão. A consulta v3 funcionou nos pedidos feitos. Convém concentrar o tratamento da resposta numa função própria para facilitar eventuais alterações.

### Cuidados na utilização

- Os limites publicados são 15 consultas de produto por minuto/IP e 10 pesquisas por minuto/IP. Depois de reconhecer um código, o leitor deve parar os pedidos repetidos. Guardar resultados em cache também ajuda.
- Os dados são colaborativos e podem estar incompletos. Se o produto não existir, o formulário deve permitir preenchimento manual.
- A quantidade indicada é a da embalagem, não o stock que existe em casa. A quantidade em stock e a validade do lote têm de ser indicadas pelo utilizador.
- Um campo de alergénios vazio não garante que o produto não os contém.
- A base usa a licença ODbL e as imagens CC BY-SA. É necessário manter a atribuição e verificar as condições antes de distribuir a aplicação.

Para este projeto, é uma opção a manter em avaliação. Falta testar uma amostra de produtos vendidos em Portugal, incluindo marcas próprias, e verificar se os dados chegam para preencher o formulário, nomeadamente a categoria.

Referências: [documentação do Open Food Facts](https://openfoodfacts.github.io/openfoodfacts-server/api/) e [especificação v3](https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/ref/api-v3.yaml).

## 3. Pesquisa de receitas — TheMealDB

O TheMealDB disponibiliza a chave pública `1` para desenvolvimento e testes. Os endpoints escolhidos para experimentar foram:

```text
GET https://www.themealdb.com/api/json/v1/1/search.php?s={nome}
GET https://www.themealdb.com/api/json/v1/1/filter.php?i={ingrediente}
GET https://www.themealdb.com/api/json/v1/1/lookup.php?i={id}
```

O primeiro pesquisa pelo nome, o segundo filtra por um ingrediente e o terceiro obtém os detalhes de uma receita. O filtro devolveu resultados resumidos; para obter as instruções e os ingredientes é necessário consultar os detalhes.

Nas respostas recebidas, os ingredientes estão em `strIngredient1` até `strIngredient20`, com as medidas correspondentes em `strMeasure1` até `strMeasure20`. Na aplicação, estes pares podem ser convertidos numa lista, ignorando os campos vazios. Uma pesquisa sem resultados devolveu HTTP 200 com `meals: null`, pelo que não basta verificar o código HTTP.

### Limitações para o SmartPantry

O filtro de vários ingredientes é premium. A FAQ declara uso ilimitado, mas não apresenta uma quota numérica por minuto ou uma garantia de disponibilidade. Mesmo assim, devem ser evitados pedidos desnecessários e tratados os erros de rede. Para um lançamento público, o guia recomenda uma chave de produção.

As receitas consultadas estão em inglês, as medidas são texto e não incluem campos estruturados de alergénios ou número de porções. Por isso, a API pode servir para experimentar a pesquisa, mas ainda não está demonstrado que permita cumprir a filtragem alimentar e o ajuste de porções pedidos no enunciado. Esses requisitos precisam de uma avaliação adicional antes da escolha definitiva. Uma futura chave privada não deve ficar exposta no frontend.

Referências: [guia da API](https://www.themealdb.com/docs_api_guide.php) e [FAQ](https://www.themealdb.com/faq.php).

## 4. Resultados dos pedidos

Foram feitos seis pedidos GET em Node.js, no dia 29/10/2026:

- Produto `3017620422003`: HTTP 200, `status: success` e os oito campos pedidos.
- Código `0000000000000`: HTTP 404, `status: failure`, sem produto.
- Pesquisa por `Arrabiata`: HTTP 200, uma receita com o ID `52771`.
- Detalhes da receita `52771`: HTTP 200, com instruções, ingredientes e medidas.
- Filtro por `chicken_breast`: HTTP 200, com 17 resultados resumidos.
- Pesquisa por um nome inexistente: HTTP 200, com `meals: null`.

São os resultados dessa execução; o conteúdo e as contagens podem mudar. Os seis pedidos devolveram `Access-Control-Allow-Origin: *`, o que é favorável ao acesso pelo frontend sem credenciais. Contudo, Node.js não aplica as regras CORS do browser, pelo que ainda falta verificar os pedidos dentro da aplicação. Não foram feitos testes de carga ou de disponibilidade prolongada.

### Como repetir as consultas

Estes exemplos podem ser abertos no browser para ver a resposta:

- [Produto de teste](https://world.openfoodfacts.org/api/v3/product/3017620422003?fields=code,product_name,brands,quantity,ingredients_text,allergens_tags,traces_tags,image_front_small_url)
- [Pesquisa por Arrabiata](https://www.themealdb.com/api/json/v1/1/search.php?s=Arrabiata)
- [Detalhes da receita 52771](https://www.themealdb.com/api/json/v1/1/lookup.php?i=52771)
- [Receitas com chicken_breast](https://www.themealdb.com/api/json/v1/1/filter.php?i=chicken_breast)

Também é possível consultar as receitas no PowerShell:

```powershell
$resposta = Invoke-RestMethod -Uri 'https://www.themealdb.com/api/json/v1/1/search.php?s=Arrabiata'
$resposta.meals | Select-Object idMeal, strMeal, strCategory
```

Abrir estes links permite inspecionar os dados, mas não substitui testar um `fetch` a partir da aplicação. Na implementação, usar `URLSearchParams` para construir os parâmetros e tratar respostas inválidas, HTTP 404, HTTP 429/503 e falhas de rede sem apagar os dados locais ou repetir pedidos indefinidamente.

## 5. O que falta validar

Antes de dar a leitura de códigos da US10 como validada, ficam estes testes por fazer:

1. Num Android/Chrome e num iPhone/Safari, abrir a página por HTTPS e verificar o acesso à câmara traseira.
2. Recusar a permissão e confirmar que continua a ser possível introduzir o produto manualmente.
3. Ler códigos EAN-13/EAN-8 reais, também com pouca luz, sem duplicar pedidos.
4. Verificar a alternativa quando `BarcodeDetector` não estiver disponível.
5. Fechar o leitor e confirmar que os tracks da câmara terminam.
6. Fazer os pedidos às APIs pelo frontend e testar falhas de rede e dados em falta.

O acesso à câmara é viável segundo a documentação e os endpoints consultados responderam. A leitura em telemóveis e a adequação das receitas às restrições do perfil continuam por validar. Estas são as principais dúvidas a resolver antes de considerar as integrações prontas.
