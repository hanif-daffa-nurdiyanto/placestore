import { describe, expect, it } from "vitest";
import { SEED_CONFIG, SEED_PRODUCTS, SEED_SHOPS } from "./seedManifest";

describe("seed manifest", () => {
  it("defines one shop and seven products for every category", () => {
    expect(SEED_SHOPS).toHaveLength(6);
    expect(new Set(SEED_SHOPS.map((shop) => shop.categorySlug)).size).toBe(6);
    for (const shop of SEED_SHOPS) {
      expect(
        SEED_PRODUCTS.filter(
          (product) => product.categorySlug === shop.categorySlug,
        ),
      ).toHaveLength(SEED_CONFIG.productsPerCategory);
    }
    expect(SEED_PRODUCTS).toHaveLength(
      SEED_SHOPS.length * SEED_CONFIG.productsPerCategory,
    );
  });

  it("keeps product keys, shop keys, and slugs unique", () => {
    expect(new Set(SEED_PRODUCTS.map((product) => product.seedKey)).size).toBe(
      SEED_PRODUCTS.length,
    );
    expect(new Set(SEED_SHOPS.map((shop) => shop.seedKey)).size).toBe(
      SEED_SHOPS.length,
    );
    expect(new Set(SEED_SHOPS.map((shop) => shop.slug)).size).toBe(
      SEED_SHOPS.length,
    );
  });

  it("defines one to three variants and SKU combinations per product", () => {
    for (const product of SEED_PRODUCTS) {
      expect(product.variants.length).toBeGreaterThanOrEqual(1);
      expect(product.variants.length).toBeLessThanOrEqual(3);
      expect(product.skus.length).toBeGreaterThanOrEqual(1);
      expect(product.skus.length).toBeLessThanOrEqual(3);

      const keys = new Set<string>();
      for (const sku of product.skus) {
        expect(sku.options.map((option) => option.name)).toEqual(
          product.variants.map((variant) => variant.name),
        );
        expect(Number.isInteger(sku.price) && sku.price >= 0).toBe(true);
        expect(Number.isInteger(sku.stock) && sku.stock >= 0).toBe(true);
        const key = sku.options
          .map((option) => `${option.name}=${option.value}`)
          .join("|");
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }
      expect(product.skus.some((sku) => sku.stock > 0)).toBe(true);
    }
  });
});
