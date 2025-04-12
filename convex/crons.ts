import { cronJobs } from "convex/server";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

type NotificationResult = {
  processed: number;
};

type VpnAccountCheckResult = any;

export const checkAndNotifySubscriptions = internalAction({
  args: {},
  returns: v.object({ processed: v.number() }),
  handler: async (ctx): Promise<NotificationResult> => {
    // @ts-ignore
    const result = await ctx.runMutation(internal.userSubscriptions.checkSubscriptionStatuses);
    console.log("Проверка подписок выполнена:", result);
    
    // @ts-ignore
    const notifications = await ctx.runQuery(internal.notifications.getUnsentNotifications);
    
    for (const notification of notifications) {
      try {
        // @ts-ignore
        const user = await ctx.runQuery(internal.users.getUserById, { 
          userId: notification.userId 
        });
        
        if (user && user.telegramId) {
          // @ts-ignore
          await ctx.runAction(internal.notifications.sendNotification, {
            telegramId: user.telegramId,
            message: notification.message
          });
          console.log("Уведомление отправлено:", notification.message);
          console.log("Пользователь:", user.telegramId);
          // @ts-ignore
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

export const checkAndNotifyVpnAccounts = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<VpnAccountCheckResult> => {
    // @ts-ignore
    const result = await ctx.runMutation(internal.vpnAccounts.checkAccountsStatus);
    console.log("Проверка VPN-аккаунтов выполнена:", result);
    return result;
  },
});

const crons = cronJobs();

crons.interval("Check and notify subscriptions", { hours: 1 }, internal.crons.checkAndNotifySubscriptions);

crons.interval("Check and notify VPN accounts", { hours: 1 }, internal.crons.checkAndNotifyVpnAccounts);

export default crons; 