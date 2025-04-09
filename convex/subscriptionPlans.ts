import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Получение всех активных тарифов
export const getActivePlans = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("subscriptionPlans")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Получение всех тарифов (для админов)
export const getAllPlans = query({
  handler: async (ctx) => {
    return await ctx.db.query("subscriptionPlans").collect();
  },
});

// Получение тарифа по ID
export const getPlanById = query({
  args: { planId: v.id("subscriptionPlans") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.planId);
  },
});

// Создание нового тарифа
export const createPlan = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    durationDays: v.number(),
    trafficGB: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("subscriptionPlans", {
      name: args.name,
      description: args.description,
      durationDays: args.durationDays,
      trafficGB: args.trafficGB,
      isActive: args.isActive,
    });
  },
});

// Обновление существующего тарифа
export const updatePlan = mutation({
  args: {
    planId: v.id("subscriptionPlans"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    durationDays: v.optional(v.number()),
    trafficGB: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { planId, ...updates } = args;
    
    const plan = await ctx.db.get(planId);
    if (!plan) {
      throw new Error("Тариф не найден");
    }
    
    // Фильтруем undefined значения
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    
    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(planId, filteredUpdates);
    }
    
    return await ctx.db.get(planId);
  },
});

// Удаление тарифа
export const deletePlan = mutation({
  args: { planId: v.id("subscriptionPlans") },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      throw new Error("Тариф не найден");
    }
    
    // Проверяем, используется ли тариф
    const subscriptions = await ctx.db
      .query("userSubscriptions")
      .filter((q) => q.eq(q.field("planId"), args.planId))
      .collect();
    
    if (subscriptions.length > 0) {
      // Если тариф используется, просто деактивируем его
      await ctx.db.patch(args.planId, { isActive: false });
      return false;
    } else {
      // Если тариф не используется, удаляем его
      await ctx.db.delete(args.planId);
      return true;
    }
  },
});

// Создание начальных тарифов (для инициализации)
export const initializeDefaultPlans = mutation({
  handler: async (ctx) => {
    // Проверяем, есть ли уже тарифы
    const existingPlans = await ctx.db.query("subscriptionPlans").collect();
    if (existingPlans.length > 0) {
      return { success: false, message: "Тарифы уже существуют" };
    }
    
    // Создаем тарифы VLESS на разные периоды
    await ctx.db.insert("subscriptionPlans", {
      name: "VLESS на день",
      description: "Быстрый доступ к VPN на 1 день с лимитом 5 ГБ",
      durationDays: 1,
      trafficGB: 5,
      isActive: true,
    });
    
    await ctx.db.insert("subscriptionPlans", {
      name: "VLESS на неделю",
      description: "Доступ к VPN на 7 дней с лимитом 20 ГБ",
      durationDays: 7,
      trafficGB: 20,
      isActive: true,
    });
    
    await ctx.db.insert("subscriptionPlans", {
      name: "VLESS на месяц",
      description: "Доступ к VPN на 30 дней с лимитом 100 ГБ",
      durationDays: 30,
      trafficGB: 100,
      isActive: true,
    });
    
    await ctx.db.insert("subscriptionPlans", {
      name: "VLESS Премиум",
      description: "Премиум доступ к VPN на 30 дней с лимитом 300 ГБ",
      durationDays: 30,
      trafficGB: 300,
      isActive: true,
    });
    
    await ctx.db.insert("subscriptionPlans", {
      name: "VLESS Безлимитный",
      description: "Безлимитный доступ к VPN на 30 дней",
      durationDays: 30,
      trafficGB: 1000, // Имитация безлимита
      isActive: true,
    });
    
    return { success: true, message: "Базовые тарифы VLESS созданы" };
  },
}); 