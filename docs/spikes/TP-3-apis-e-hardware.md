# TP-3 — Estudo de Viabilidade: APIs Públicas e Acesso à Câmara

Data: 27 de outubro de 2026
Objetivo: Avaliar a viabilidade do acesso à câmara pelo browser para suporte à US10 e analisar a integração com as APIs públicas do Open Food Facts entre outros.


## 1. Acesso à câmara e leitura de códigos de barras

O acesso à câmara no browser é perfeitamente viável através da API nativa navigator.mediaDevices.getUserMedia.

Requisitos: Requer obrigatoriamente um contexto seguro (HTTPS) ou localhost em ambiente de desenvolvimento.

Leitura de códigos (US10): A API nativa BarcodeDetector ainda tem suporte limitado nos browsers. Para garantir compatibilidade com códigos de barras de supermercado (EAN-13 e EAN-8), recomenda-se a utilização de uma biblioteca dedicada como html5-qrcode ou @zxing/browser.

Uso e UX: O leitor deve usar a câmara traseira (facingMode: 'environment'), libertar a câmara ao fechar o modal e disponibilizar sempre uma opção de introdução manual caso o utilizador recuse permissões ou a leitura falhe.

## 2. API de Produtos — Open Food Facts

API pública e gratuita para consulta de produtos alimentares pelo código de barras, sem necessidade de chave de API.

Endpoint principal (v3): GET https://world.openfoodfacts.org/api/v3/product/{barcode}

Campos relevantes: Nome do produto, marca, quantidade, imagem, lista de ingredientes e marcas de alergénios.

Pontos de atenção:
- Suporta pedidos diretos do frontend (CORS ativo).
- Limite recomendado de 15 consultas por minuto por IP. Deve guardar-se o resultado em cache para evitar chamadas repetidas.
- Os dados são colaborativos; se o produto não for encontrado, a aplicação deve permitir o preenchimento manual pelo utilizador.

## 3. API de Receitas — TheMealDB

Testada para pesquisa e sugestão de receitas a partir de ingredientes ou nomes de pratos, utilizando a chave pública de testes "1".

Endpoints analisados:
- Pesquisa por nome: GET /api/json/v1/1/search.php?s={nome}
- Filtro por ingrediente: GET /api/json/v1/1/filter.php?i={ingrediente}
- Detalhes da receita: GET /api/json/v1/1/lookup.php?i={id}

Limitações identificadas:
- As receitas e ingredientes estão apenas em inglês.
- Não fornece dados estruturados sobre alergénios ou porções exatas.
- O filtro por múltiplos ingredientes em simultâneo é uma funcionalidade paga.

Conclusão: Serve para prototipagem e testes iniciais de pesquisa, mas pode requerer uma alternativa mais robusta no futuro para cumprir os filtros alimentares avançados.

## 4. Conclusões e próximos passos (Validação para a US10)

Os testes de rede confirmaram que os endpoints respondem corretamente com os cabeçalhos CORS necessários para consumo no frontend. O estudo de viabilidade fica assim concluído com as seguintes recomendações para quando se implementar a US10:

1. Testar o fluxo da câmara num dispositivo móvel real (Android e iOS) sob HTTPS.
2. Integrar a biblioteca de leitura de códigos de barras no componente modal da interface.
3. Garantir o tratamento adequado de erros de rede (produtos não encontrados ou falta de ligação) sem bloquear o utilizador.