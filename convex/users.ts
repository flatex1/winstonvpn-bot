import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Получение пользователя по Telegram ID
export const getUserByTelegramId = query({
  args: { telegramId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();
  },
});

// Получение пользователя по ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Создание или обновление пользователя
export const createOrUpdateUser = mutation({
  args: {
    telegramId: v.string(),
    username: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Проверяем, существует ли пользователь
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();

    if (existingUser) {
      // Обновляем существующего пользователя
      await ctx.db.patch(existingUser._id, {
        username: args.username,
        firstName: args.firstName,
        lastName: args.lastName,
      });
      return existingUser._id;
    } else {
      // Создаем нового пользователя
      return await ctx.db.insert("users", {
        telegramId: args.telegramId,
        username: args.username,
        firstName: args.firstName,
        lastName: args.lastName,
        registeredAt: Date.now(),
        isAdmin: false,
        isBlocked: false,
      });
    }
  },
});

// Установка статуса администратора
export const setAdminStatus = mutation({
  args: {
    userId: v.id("users"),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    await ctx.db.patch(args.userId, {
      isAdmin: args.isAdmin,
    });
    
    return true;
  },
});

// Блокировка/разблокировка пользователя
export const setBlockStatus = mutation({
  args: {
    userId: v.id("users"),
    isBlocked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }
    
    await ctx.db.patch(args.userId, {
      isBlocked: args.isBlocked,
    });
    
    return true;
  },
});

// Получение списка всех пользователей (для админов)
export const getAllUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Получение списка администраторов
export const getAdmins = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .collect();
  },
});

// Получение статистики пользователей
export const getUserStats = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const totalUsers = users.length;
    const admins = users.filter(user => user.isAdmin).length;
    const blockedUsers = users.filter(user => user.isBlocked).length;
    const activeUsers = totalUsers - blockedUsers;
    
    return {
      totalUsers,
      activeUsers,
      admins,
      blockedUsers,
    };
  },
}); 