import assert from "node:assert/strict";
import { test } from "node:test";
import { lookupProduct } from "../src/services/productLookup.ts";

test("US10: aproveita nome genérico, última categoria e tamanho multiplicado", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({
    status: 1,
    product: {
      product_name_pt: " ", generic_name: "  Iogurte  ", categories: "Laticínios, , Iogurtes ",
      quantity: "4 × 125 g",
    },
  }));

  const product = await lookupProduct("  4006381333931 ");
  const [url, options] = mock.mock.calls[0].arguments;
  assert.equal(url.hostname, "world.openfoodfacts.org");
  assert.equal(url.searchParams.get("lc"), "pt");
  assert.equal(options.headers.Accept, "application/json");
  assert.deepEqual(product, {
    barcode: "4006381333931", name: "Iogurte", category: "Iogurtes",
    packageSize: "4 × 125 g", quantity: 500, unit: "g",
  });
});

test("US10: cancelar uma consulta em curso permite consultar novamente o mesmo código", async (t) => {
  const controller = new AbortController();
  const mock = t.mock.method(globalThis, "fetch", async (_url, { signal }) => {
    if (signal) {
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    }
    return Response.json({ status: 1, product: { product_name: "Iogurte", quantity: "125 g" } });
  });

  const initial = lookupProduct("4006381333932", controller.signal);
  controller.abort();
  await assert.rejects(initial, { name: "AbortError" });
  assert.equal((await lookupProduct("4006381333932")).name, "Iogurte");
  assert.equal(mock.mock.callCount(), 2);
});
