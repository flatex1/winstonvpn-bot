import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Модуль для управления тарифными планами подписки VPN.
 * Содержит функции для создания, чтения, обновления и удаления тарифов.
 */

/**
 * Получает все активные тарифные планы.
 * 
 * @returns {Promise<Array<object>>} Массив активных тарифных планов.
 * @example
 * // Пример использования в клиентском коде
 * const activePlans = await client.query(subscriptionPlans.getActivePlans);
 */
export const getActivePlans = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("subscriptionPlans")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Получает все тарифные планы независимо от их статуса активности.
 * Предназначено для использования администраторами.
 * 
 * @returns {Promise<Array<object>>} Массив всех тарифных планов.
 */
export const getAllPlans = query({
  handler: async (ctx) => {
    return await ctx.db.query("subscriptionPlans").collect();
  },
});

/**
 * Получает тарифный план по его идентификатору.
 * 
 * @param {object} args - Аргументы запроса.
 * @param {Id<"subscriptionPlans">} args.planId - Идентификатор тарифного плана.
 * @returns {Promise<object|null>} Тарифный план или null, если план не найден.
 */
export const getPlanById = query({
  args: { planId: v.id("subscriptionPlans") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.planId);
  },
});

/**
 * Создает новый тарифный план с указанными параметрами.
 * 
 * @param {object} args - Аргументы для создания тарифа.
 * @param {string} args.name - Название тарифного плана.
 * @param {string} args.description - Описание тарифного плана.
 * @param {number} args.durationDays - Продолжительность тарифа в днях.
 * @param {number} args.trafficGB - Лимит трафика в гигабайтах.
 * @param {boolean} args.isActive - Флаг активности тарифа.
 * @returns {Promise<Id<"subscriptionPlans">>} Идентификатор созданного тарифного плана.
 */
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

/**
 * Обновляет существующий тарифный план.
 * Обновляются только те поля, которые переданы в аргументах.
 * 
 * @param {object} args - Аргументы для обновления тарифа.
 * @param {Id<"subscriptionPlans">} args.planId - Идентификатор тарифного плана.
 * @param {string} [args.name] - Новое название тарифного плана (опционально).
 * @param {string} [args.description] - Новое описание тарифного плана (опционально).
 * @param {number} [args.durationDays] - Новая продолжительность тарифа в днях (опционально).
 * @param {number} [args.trafficGB] - Новый лимит трафика в гигабайтах (опционально).
 * @param {boolean} [args.isActive] - Новый флаг активности тарифа (опционально).
 * @returns {Promise<object>} Обновленный тарифный план.
 * @throws {Error} Ошибка, если тариф не найден.
 */
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

/**
 * Удаляет тарифный план или деактивирует его, если он используется в подписках пользователей.
 * 
 * @param {object} args - Аргументы для удаления тарифа.
 * @param {Id<"subscriptionPlans">} args.planId - Идентификатор тарифного плана.
 * @returns {Promise<boolean>} true, если тариф был полностью удален; false, если тариф был только деактивирован.
 * @throws {Error} Ошибка, если тариф не найден.
 */
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

/**
 * Инициализирует базовые тарифные планы в системе.
 * Создает стандартный набор тарифов VLESS с различными параметрами.
 * Функция предотвращает повторную инициализацию, если в базе уже есть тарифы.
 * 
 * @returns {Promise<object>} Объект с информацией о результате операции.
 * @property {boolean} success - Флаг успешности операции.
 * @property {string} message - Сообщение о результате операции.
 */
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
      trafficGB: 1000, // Имитация безлимита. TODO: сделать нормальный безлимит.
      isActive: true,
    });
    
    return { success: true, message: "Базовые тарифы VLESS созданы" };
  },
}); 