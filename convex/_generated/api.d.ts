/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as subscriptionPlans from "../subscriptionPlans.js";
import type * as userSubscriptions from "../userSubscriptions.js";
import type * as users from "../users.js";
import type * as vpnAccountActions from "../vpnAccountActions.js";
import type * as vpnAccounts from "../vpnAccounts.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  http: typeof http;
  notifications: typeof notifications;
  subscriptionPlans: typeof subscriptionPlans;
  userSubscriptions: typeof userSubscriptions;
  users: typeof users;
  vpnAccountActions: typeof vpnAccountActions;
  vpnAccounts: typeof vpnAccounts;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
