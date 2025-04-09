import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Получение активной подписки пользователя
export const getActiveSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Получаем самую последнюю активную подписку пользователя
    const subscription = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .first();
    
    if (!subscription) {
      return null;
    }
    
    // Получаем информацию о тарифе
    const plan = await ctx.db.get(subscription.planId);
    
    return {
      ...subscription,
      plan,
    };
  },
});

// Получение всех подписок пользователя
export const getUserSubscriptions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const subscriptions = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Получаем информацию о тарифах для каждой подписки
    const planIds = Array.from(new Set(subscriptions.map(sub => sub.planId)));
    const plans = await Promise.all(planIds.map(id => ctx.db.get(id)));
    const plansMap = Object.fromEntries(
      plans.filter(Boolean).map(plan => [plan!._id, plan])
    );
    
    return subscriptions.map(subscription => ({
      ...subscription,
      plan: plansMap[subscription.planId],
    }));
  },
});

// Создание новой подписки для пользователя (заглушка вместо оплаты)
export const createFreeSubscription = mutation({
  args: {
    userId: v.id("users"),
    planId: v.id("subscriptionPlans"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Тариф не найден");
    }
    
    // Деактивируем текущую активную подписку, если она есть
    const activeSubscription = await ctx.db
      .query("userSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    
    if (activeSubscription) {
      await ctx.db.patch(activeSubscription._id, {
        status: "canceled",
        lastUpdatedAt: Date.now(),
      });
    }
    
    // Создаем новую подписку
    const now = Date.now();
    const expiresAt = now + plan.durationDays * 24 * 60 * 60 * 1000;
    
    return await ctx.db.insert("userSubscriptions", {
      userId: args.userId,
      planId: args.planId,
      status: "active",
      createdAt: now,
      expiresAt: expiresAt,
      lastUpdatedAt: now,
    });
  },
});

// Продление подписки
export const extendSubscription = mutation({
  args: {
    subscriptionId: v.id("userSubscriptions"),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Подписка не найдена");
    }
    
    // Расчет нового времени истечения
    const expiresAt = Math.max(
      subscription.expiresAt,
      Date.now()
    ) + args.durationDays * 24 * 60 * 60 * 1000;
    
    await ctx.db.patch(args.subscriptionId, {
      expiresAt,
      status: "active",
      lastUpdatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.subscriptionId);
  },
});

// Отмена подписки
export const cancelSubscription = mutation({
  args: { subscriptionId: v.id("userSubscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Подписка не найдена");
    }
    
    await ctx.db.patch(args.subscriptionId, {
      status: "canceled",
      lastUpdatedAt: Date.now(),
    });
    
    return true;
  },
});

// Проверка статуса подписок (для автоматического обновления статусов)
export const checkSubscriptionStatuses = mutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Получаем все активные подписки, срок которых истек
    const expiredSubscriptions = await ctx.db
      .query("userSubscriptions")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .collect();
    
    // Обновляем статус на "expired"
    for (const subscription of expiredSubscriptions) {
      await ctx.db.patch(subscription._id, {
        status: "expired",
        lastUpdatedAt: now,
      });
    }
    
    return {
      expiredCount: expiredSubscriptions.length,
    };
  },
}); 