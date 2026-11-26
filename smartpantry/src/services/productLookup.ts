export interface ScannedProduct {
  barcode: string;
  name: string;
  category: string;
  packageSize: string;
  quantity?: number;
  unit?: string;
}

interface PackageAmount {
  quantity: number;
  unit: string;
}

const productCache = new Map<string, ScannedProduct>();

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAmount(quantity: number, unit: string): PackageAmount | undefined {
  const conversions: Record<string, { unit: string; factor: number }> = {
    g: { unit: "g", factor: 1 },
    kg: { unit: "kg", factor: 1 },
    mg: { unit: "g", factor: 0.001 },
    ml: { unit: "ml", factor: 1 },
    cl: { unit: "ml", factor: 10 },
    dl: { unit: "ml", factor: 100 },
    l: { unit: "L", factor: 1 },
    un: { unit: "un", factor: 1 },
  };
  if (!Object.hasOwn(conversions, unit.toLowerCase()) || !Number.isFinite(quantity) || quantity <= 0) {
    return undefined;
  }
  const conversion = conversions[unit.toLowerCase()];
  return {
    quantity: Number((quantity * conversion.factor).toPrecision(12)),
    unit: conversion.unit,
  };
}

function parsePackageSize(value: string): PackageAmount | undefined {
  const match = value.match(
    /^(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|cl|dl|l|un)\s*[e℮]?$/i,
  );
  if (!match) return undefined;
  const count = match[1] ? Number(match[1]) : 1;
  const quantity = Number(match[2].replace(",", ".")) * count;
  return normalizeAmount(quantity, match[3]);
}

export async function lookupProduct(
  value: string,
  signal?: AbortSignal,
): Promise<ScannedProduct> {
  const barcode = value.trim();
  if (!/^(?:\d{8}|\d{12,14})$/.test(barcode)) {
    throw new Error("Lê um código de barras válido.");
  }
  if (signal?.aborted) throw signal.reason;
  const cached = productCache.get(barcode);
  if (cached) return cached;

  const url = new URL(
    "https://world.openfoodfacts.org/api/v2/product/" + barcode + ".json",
  );
  url.searchParams.set("lc", "pt");
  url.searchParams.set("fields", [
    "product_name", "product_name_pt", "generic_name", "categories",
    "quantity", "product_quantity", "product_quantity_unit",
  ].join(","));

  let response: Response;
  try {
    response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new Error("Não foi possível consultar o produto. Verifica a ligação à Internet.");
  }

  if (response.status === 404) {
    throw new Error("Produto não encontrado. Preenche os dados manualmente.");
  }
  if (!response.ok) {
    throw new Error("O serviço de produtos está indisponível. Tenta novamente.");
  }

  let data: { status?: number; product?: Record<string, unknown> } | null;
  try {
    data = await response.json();
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new Error("O serviço de produtos devolveu dados inválidos. Tenta novamente.");
  }

  if (data?.status !== 1 || !data.product || typeof data.product !== "object") {
    throw new Error("Produto não encontrado. Preenche os dados manualmente.");
  }

  const product = data.product;
  const packageSize = text(product.quantity);
  const amount = normalizeAmount(
    Number(product.product_quantity),
    text(product.product_quantity_unit),
  ) ?? parsePackageSize(packageSize);
  const category = text(product.categories).split(",")
    .map((entry) => entry.trim()).filter(Boolean).at(-1) ?? "";

  const result: ScannedProduct = {
    barcode,
    name: text(product.product_name_pt) || text(product.product_name) || text(product.generic_name),
    category,
    packageSize: packageSize || (amount ? amount.quantity + " " + amount.unit : ""),
    quantity: amount?.quantity,
    unit: amount?.unit,
  };
  productCache.set(barcode, result);
  return result;
}
