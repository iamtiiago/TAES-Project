import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lookupProduct } from '../src/services/productLookup.ts';

function respondWithProduct(context, product) {
  return context.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ status: 1, product }), {
      headers: { 'Content-Type': 'application/json' },
    }));
}

test('US10: consulta o código sem perder zeros e preenche nome, categoria e tamanho', async (context) => {
  const request = respondWithProduct(context, {
    product_name: 'Milk',
    product_name_pt: 'Leite meio-gordo',
    categories: 'Laticínios, Leites, Leites meio-gordos',
    quantity: '1 L',
    product_quantity: 1000,
    product_quantity_unit: 'ml',
  });
  const product = await lookupProduct('0001234567890');
  const url = new URL(request.mock.calls[0].arguments[0]);
  assert.match(url.pathname, /0001234567890\.json$/);
  assert.deepEqual(product, {
    barcode: '0001234567890', name: 'Leite meio-gordo',
    category: 'Leites meio-gordos', packageSize: '1 L', quantity: 1000, unit: 'ml',
  });
});

test('US10: normaliza tamanhos decimais, multipacks e unidades para o formulário', async (context) => {
  const source = { product_name: 'Produto', quantity: '' };
  respondWithProduct(context, source);
  const examples = [
    { label: '1,5 L', quantity: 1.5, unit: 'L' },
    { label: '6 x 125 g', quantity: 750, unit: 'g' },
    { label: '25 cl', quantity: 250, unit: 'ml' },
    { label: '400 g e', quantity: 400, unit: 'g' },
  ];
  for (const [index, example] of examples.entries()) {
    source.quantity = example.label;
    const product = await lookupProduct('2000000' + index);
    assert.equal(product.quantity, example.quantity);
    assert.equal(product.unit, example.unit);
    assert.equal(product.packageSize, example.label);
  }
});

test('US10: conserva campos desconhecidos em branco para revisão manual', async (context) => {
  respondWithProduct(context, {
    product_name: 123, quantity: 'uma caixa',
    product_quantity: 2, product_quantity_unit: 'constructor',
  });
  const product = await lookupProduct('20000010');
  assert.equal(product.name, '');
  assert.equal(product.category, '');
  assert.equal(product.packageSize, 'uma caixa');
  assert.equal(product.quantity, undefined);
  assert.equal(product.unit, undefined);
});

test('US10: aceita dados estruturados quando o tamanho textual está ausente', async (context) => {
  respondWithProduct(context, { product_name: 'Arroz', product_quantity: '500', product_quantity_unit: 'g' });
  const product = await lookupProduct('20000011');
  assert.equal(product.name, 'Arroz');
  assert.equal(product.packageSize, '500 g');
  assert.equal(product.quantity, 500);
  assert.equal(product.unit, 'g');
});

test('US10: reutiliza resultados para evitar consultas repetidas do mesmo produto', async (context) => {
  const request = respondWithProduct(context, { product_name: 'Arroz', quantity: '500 g' });
  const first = await lookupProduct('20000012');
  assert.deepEqual(await lookupProduct('20000012'), first);
  assert.equal(request.mock.callCount(), 1);
});

test('US10: informa quando o código não está no catálogo', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ status: 0 }), { status: 404 }));
  await assert.rejects(lookupProduct('20000013'), /Produto não encontrado/);
});

test('US10: trata indisponibilidade, erros de rede e respostas inválidas', async (context) => {
  let respond = async () => new Response('', { status: 503 });
  context.mock.method(globalThis, 'fetch', () => respond());
  await assert.rejects(lookupProduct('20000014'), /indisponível/);
  respond = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(lookupProduct('20000015'), /ligação à Internet/);
  respond = async () => new Response('invalid json');
  await assert.rejects(lookupProduct('20000016'), /dados inválidos/);
});

test('US10: rejeita códigos inválidos antes de contactar a API', async (context) => {
  const request = respondWithProduct(context, {});
  await assert.rejects(lookupProduct('ABC123'), /código de barras válido/);
  assert.equal(request.mock.callCount(), 0);
});

test('US10: respeita o cancelamento de uma consulta', async (context) => {
  const request = respondWithProduct(context, {});
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(lookupProduct('20000017', controller.signal), { name: 'AbortError' });
  assert.equal(request.mock.callCount(), 0);
});
