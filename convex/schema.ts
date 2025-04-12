import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  /**
   * Таблица пользователей
   */
  users: defineTable({
    telegramId: v.string(), // ID пользователя в Telegram
    username: v.optional(v.string()), // @username пользователя (может отсутствовать)
    firstName: v.string(), // Имя пользователя
    lastName: v.optional(v.string()), // Фамилия пользователя (может отсутствовать)
    registeredAt: v.number(), // Timestamp регистрации
    isAdmin: v.boolean(), // Флаг администратора
    isBlocked: v.boolean(), // Флаг блокировки пользователя
  }).index("by_telegram_id", ["telegramId"]),

  /**
   * Таблица тарифов подписок
   */
  subscriptionPlans: defineTable({
    name: v.string(), // Название тарифа
    description: v.string(), // Описание тарифа
    durationDays: v.number(), // Длительность подписки в днях
    trafficGB: v.number(), // Лимит трафика в ГБ
    isActive: v.boolean(), // Активен ли тариф
  }),

  /**
   * Таблица подписок пользователей
   */
  userSubscriptions: defineTable({
    userId: v.id("users"), // ID пользователя
    planId: v.id("subscriptionPlans"), // ID тарифа
    status: v.string(), // Статус подписки: active, expired, canceled
    createdAt: v.number(), // Timestamp создания
    expiresAt: v.number(), // Timestamp истечения
    lastUpdatedAt: v.number(), // Timestamp последнего обновления
  }).index("by_user", ["userId"]),

  /**
   * Таблица VPN-аккаунтов
   */
  vpnAccounts: defineTable({
    userId: v.id("users"), // ID пользователя
    inboundId: v.number(), // ID inbound в 3x-ui
    clientId: v.string(), // ID клиента в 3x-ui
    email: v.string(), // Email/логин в 3x-ui
    expiresAt: v.number(), // Timestamp истечения аккаунта
    trafficLimit: v.number(), // Лимит трафика в байтах
    trafficUsed: v.number(), // Использованный трафик в байтах
    status: v.string(), // Статус: active, expired, blocked
    createdAt: v.number(), // Timestamp создания
    lastUpdatedAt: v.number(), // Timestamp последнего обновления
    connectionDetails: v.string(), // Строка подключения или ссылка для импорта
  }).index("by_user", ["userId"]).index("by_email", ["email"]),
  
  /**
   * Таблица уведомлений
   */
  notifications: defineTable({
    userId: v.id("users"), // ID пользователя
    type: v.string(), // Тип уведомления: expired, expires_soon_1day, expires_soon_3days
    subscriptionId: v.optional(v.id("userSubscriptions")), // ID подписки (может отсутствовать)
    message: v.string(), // Текст уведомления
    isRead: v.boolean(), // Прочитано ли уведомление
    createdAt: v.number(), // Timestamp создания
    isSent: v.optional(v.boolean())
  }).index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"])
    .index("by_user_type_subscription", ["userId", "type", "subscriptionId"]),
}); 