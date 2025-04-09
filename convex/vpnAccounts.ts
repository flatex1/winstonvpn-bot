import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { Doc } from "./_generated/dataModel";

// Определяем типы для объекта internal
declare module "./_generated/api" {
  interface InternalApi {
    users: {
      getUserById: (args: { userId: Id<"users"> }) => Promise<User>;
    };
    userSubscriptions: {
      getActiveSubscription: (args: { userId: Id<"users"> }) => Promise<Subscription>;
    };
    vpnAccounts: {
      getUserVpnAccount: (args: { userId: Id<"users"> }) => Promise<VpnAccount | null>;
      getVpnAccountById: (args: { accountId: Id<"vpnAccounts"> }) => Promise<VpnAccount | null>;
      getVpnAccountByEmail: (args: { email: string }) => Promise<VpnAccount | null>;
      saveVpnAccount: (args: VpnAccountCreateArgs) => Promise<Id<"vpnAccounts">>;
      extendVpnAccount: (args: { accountId: Id<"vpnAccounts">; expiresAt: number; trafficLimit: number }) => Promise<VpnAccount>;
      reactivateVpnAccount: (args: { accountId: Id<"vpnAccounts">; expiresAt: number; trafficLimit: number }) => Promise<VpnAccount>;
      updateAccountTraffic: (args: { accountId: Id<"vpnAccounts">; trafficUsed: number }) => Promise<boolean>;
      deactivateAccount: (args: { accountId: Id<"vpnAccounts">; reason: string }) => Promise<boolean>;
      removeVpnAccount: (args: { accountId: Id<"vpnAccounts"> }) => Promise<boolean>;
    };
  }
}

// Типы для ответов функций
type VpnAccount = Doc<"vpnAccounts">;
type User = Doc<"users">;
type Subscription = {
  _id: Id<"userSubscriptions">;
  userId: Id<"users">;
  planId: Id<"subscriptionPlans">;
  status: string;
  expiresAt: number;
  plan: {
    name: string;
    trafficGB: number;
    durationDays: number;
  };
};

// Аргументы для создания VPN аккаунта
interface VpnAccountCreateArgs {
  userId: Id<"users">;
  inboundId: number;
  clientId: string;
  email: string;
  expiresAt: number;
  trafficLimit: number;
  trafficUsed: number;
  status: string;
  connectionDetails: string;
}

// Получение VPN-аккаунта пользователя
export const getUserVpnAccount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vpnAccounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Получение VPN-аккаунта по ID
export const getVpnAccountById = query({
  args: { accountId: v.id("vpnAccounts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.accountId);
  },
});

// Получение VPN-аккаунта по email
export const getVpnAccountByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vpnAccounts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Сохранение информации о VPN-аккаунте в БД
export const saveVpnAccount = mutation({
  args: {
    userId: v.id("users"),
    inboundId: v.number(),
    clientId: v.string(),
    email: v.string(),
    expiresAt: v.number(),
    trafficLimit: v.number(),
    trafficUsed: v.number(),
    status: v.string(),
    connectionDetails: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("vpnAccounts", {
      userId: args.userId,
      inboundId: args.inboundId,
      clientId: args.clientId,
      email: args.email,
      expiresAt: args.expiresAt,
      trafficLimit: args.trafficLimit,
      trafficUsed: args.trafficUsed,
      status: args.status,
      createdAt: now,
      lastUpdatedAt: now,
      connectionDetails: args.connectionDetails,
    });
  },
});

// Продление существующего VPN-аккаунта
export const extendVpnAccount = mutation({
  args: {
    accountId: v.id("vpnAccounts"),
    expiresAt: v.number(),
    trafficLimit: v.number(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    
    if (!account) {
      throw new Error("VPN-аккаунт не найден");
    }
    
    // Обновляем аккаунт в нашей базе
    await ctx.db.patch(args.accountId, {
      expiresAt: args.expiresAt,
      trafficLimit: args.trafficLimit,
      status: "active",
      lastUpdatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.accountId);
  },
});

// Реактивация отключенного VPN-аккаунта
export const reactivateVpnAccount = mutation({
  args: {
    accountId: v.id("vpnAccounts"),
    expiresAt: v.number(),
    trafficLimit: v.number(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    
    if (!account) {
      throw new Error("VPN-аккаунт не найден");
    }
    
    // Обновляем аккаунт в нашей базе
    await ctx.db.patch(args.accountId, {
      expiresAt: args.expiresAt,
      trafficLimit: args.trafficLimit,
      trafficUsed: 0, // Сбрасываем счетчик трафика
      status: "active",
      lastUpdatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.accountId);
  },
});

// Обновление использования трафика аккаунта
export const updateAccountTraffic = mutation({
  args: {
    accountId: v.id("vpnAccounts"),
    trafficUsed: v.number(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    
    if (!account) {
      throw new Error("VPN-аккаунт не найден");
    }
    
    await ctx.db.patch(args.accountId, {
      trafficUsed: args.trafficUsed,
      lastUpdatedAt: Date.now(),
    });
    
    return true;
  },
});

// Деактивация VPN-аккаунта
export const deactivateAccount = mutation({
  args: {
    accountId: v.id("vpnAccounts"),
    reason: v.string(), // "expired", "traffic_limit_exceeded", "manual"
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    
    if (!account) {
      throw new Error("VPN-аккаунт не найден");
    }
    
    await ctx.db.patch(args.accountId, {
      status: "blocked",
      lastUpdatedAt: Date.now(),
    });
    
    return true;
  },
});

// Проверка статуса всех VPN-аккаунтов (для автоматического обновления)
export const checkAccountsStatus = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Получаем все активные аккаунты, срок которых истек
    const expiredAccounts = await ctx.db
      .query("vpnAccounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .collect();
    
    // Обновляем статус на "expired"
    for (const account of expiredAccounts) {
      await ctx.db.patch(account._id, {
        status: "expired",
        lastUpdatedAt: now,
      });
    }
    
    return {
      expiredCount: expiredAccounts.length,
    };
  },
});

// Удаление VPN-аккаунта из БД
export const removeVpnAccount = mutation({
  args: {
    accountId: v.id("vpnAccounts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.accountId);
    return true;
  },
}); 