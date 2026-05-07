import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

export type ListCurrentUserReturn = FunctionReturnType<
  typeof api.transactions.listCurrentUser
>;

export type TransactionWithShop = NonNullable<ListCurrentUserReturn>[number];