/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addresses from "../addresses.js";
import type * as advertisements from "../advertisements.js";
import type * as cart from "../cart.js";
import type * as categories from "../categories.js";
import type * as clerk from "../clerk.js";
import type * as http from "../http.js";
import type * as products from "../products.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as seedInternal from "../seedInternal.js";
import type * as seedManifest from "../seedManifest.js";
import type * as shops from "../shops.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addresses: typeof addresses;
  advertisements: typeof advertisements;
  cart: typeof cart;
  categories: typeof categories;
  clerk: typeof clerk;
  http: typeof http;
  products: typeof products;
  reviews: typeof reviews;
  seed: typeof seed;
  seedInternal: typeof seedInternal;
  seedManifest: typeof seedManifest;
  shops: typeof shops;
  transactions: typeof transactions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
