import { cronJobs } from "convex/server";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

type NotificationResult = {
  processed: number;
};

type VpnAccountCheckResult = any; // Уточните тип в соответствии с тем, что возвращает vpnAccounts.checkAccountsStatus

// Действие для проверки статуса подписок
export const checkAndNotifySubscriptions = internalAction({
  args: {},
  returns: v.object({ processed: v.number() }),
  handler: async (ctx): Promise<NotificationResult> => {
    // Запускаем мутацию для проверки статуса подписок
    // @ts-ignore - возникает из-за ограничений типизации в crоns файлах
    const result = await ctx.runMutation(internal.userSubscriptions.checkSubscriptionStatuses);
    console.log("Проверка подписок выполнена:", result);
    
    // Получаем все непрочитанные уведомления
    // @ts-ignore - возникает из-за ограничений типизации в crоns файлах
    const notifications = await ctx.runQuery(internal.notifications.getUnsentNotifications);
    
    // Отправляем каждое уведомление пользователю
    for (const notification of notifications) {
      try {
        // Получаем информацию о пользователе
        // @ts-ignore - возникает из-за ограничений типизации в crоns файлах
        const user = await ctx.runQuery(internal.users.getUserById, { 
          userId: notification.userId 
        });
        
        if (user && user.telegramId) {
          // Отправляем уведомление через Telegram
          // @ts-ignore - возникает из-за ограничений типизации в crоns файлах
          await ctx.runAction(internal.notifications.sendNotification, {
            telegramId: user.telegramId,
            message: notification.message
          });
          console.log("Уведомление отправлено:", notification.message);
          console.log("Пользователь:", user.telegramId);
          // Помечаем уведомление как прочитанное
          // @ts-ignore - возникает из-за ограничений типизации в crоns файлах
          await ctx.runMutation(internal.notifications.markAsSent, {
            notificationId: notification._id
          });
        }
      } catch (error) {
        console.error(`Ошибка при отправке уведомления ${notification._id}:`, error);
      }
    }
    
    return { processed: notifications.length };
  },
});

// Действие для проверки статуса VPN-аккаунтов
export const checkAndNotifyVpnAccounts = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<VpnAccountCheckResult> => {
    // Запускаем мутацию для проверки статуса VPN-аккаунтов
    // @ts-ignore - возникает из-за ограничений типизации в crоns файлах
    const result = await ctx.runMutation(internal.vpnAccounts.checkAccountsStatus);
    console.log("Проверка VPN-аккаунтов выполнена:", result);
    return result;
  },
});

// Определение cron задач
const crons = cronJobs();

// Запуск проверки подписок каждый час
crons.interval("Check and notify subscriptions", { hours: 1 }, internal.crons.checkAndNotifySubscriptions);

// Запуск проверки VPN-аккаунтов каждый час
crons.interval("Check and notify VPN accounts", { hours: 1 }, internal.crons.checkAndNotifyVpnAccounts);

// Экспортируем cron задачи
export default crons; 