import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { Doc } from "./_generated/dataModel";

// Тип документа уведомления
type Notification = Doc<"notifications">;

// Получение всех непрочитанных и неотправленных уведомлений
export const getUnsentNotifications = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("notifications"),
      _creationTime: v.number(),
      userId: v.id("users"),
      type: v.string(),
      subscriptionId: v.optional(v.id("userSubscriptions")),
      message: v.string(),
      isRead: v.boolean(),
      createdAt: v.number(),
      isSent: v.optional(v.boolean())
    })
  ),
  handler: async (ctx) => {
    // Получаем все непрочитанные уведомления, которые ещё не были отправлены
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => 
        q.and(
          q.eq(q.field("isRead"), false),
          // Либо поле isSent отсутствует, либо равно false
          q.or(
            q.eq(q.field("isSent"), false),
            q.eq(q.field("isSent"), undefined)
          )
        )
      )
      .collect();
    
    return notifications;
  },
});

// Пометка уведомления как отправленное
export const markAsSent = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification) {
      return false;
    }
    
    // Обновляем уведомление, помечая его как отправленное
    await ctx.db.patch(args.notificationId, {
      isSent: true,
    });
    
    return true;
  },
});

// Пометка уведомления как прочитанное
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    
    if (!notification) {
      return false;
    }
    
    // Обновляем уведомление, помечая его как прочитанное
    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });
    
    return true;
  },
});

// Получение уведомлений пользователя
export const getUserNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("notifications"),
      _creationTime: v.number(),
      type: v.string(),
      message: v.string(),
      isRead: v.boolean(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Устанавливаем лимит по умолчанию, если он не указан
    const limit = args.limit ?? 20;
    
    // Получаем уведомления пользователя, отсортированные по времени создания (новые в начале)
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
    
    return notifications;
  },
});

// Отправка уведомления пользователю
export const sendNotification = action({
  args: {
    telegramId: v.string(),
    message: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string())
  }),
  handler: async (_ctx, args) => {
    "use node";
    
    try {
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!TELEGRAM_BOT_TOKEN) {
        throw new Error("Отсутствует токен Telegram-бота");
      }
      
      // Импортируем grammy для работы с Telegram API
      const { Bot } = await import("grammy");
      
      // Создаем экземпляр бота
      const bot = new Bot(TELEGRAM_BOT_TOKEN);
      
      // Отправляем сообщение пользователю
      await bot.api.sendMessage(args.telegramId, args.message, {
        parse_mode: "HTML",
      });
      
      return { success: true };
    } catch (error) {
      console.error("Ошибка при отправке уведомления:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
}); 