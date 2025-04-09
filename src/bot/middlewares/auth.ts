import { Context as BaseContext, NextFunction } from "grammy";
import { createLogger } from "../../utils/logger";
import convexClient from "../../services/convex-client";
import config from "../../utils/config";
import { User } from "../../services/convex-client";

interface Context extends BaseContext {
  user?: User | null;
  isAdmin?: boolean;
}

const logger = createLogger("middleware:auth");

/**
 * Middleware для проверки и регистрации пользователя
 */
export async function authMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.from) {
    logger.warn("Запрос без информации о пользователе");
    return;
  }

  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username;
    const firstName = ctx.from.first_name;
    const lastName = ctx.from.last_name;

    logger.debug(`Аутентификация пользователя ${telegramId}`);

    const user = await convexClient.getUserByTelegramId(telegramId);

    if (!user) {
      logger.info(`Регистрация нового пользователя ${telegramId}`);
      
      await convexClient.createOrUpdateUser(
        telegramId,
        username,
        firstName,
        lastName
      );
    }

    ctx.user = user;

    ctx.isAdmin = user?.isAdmin || config.ADMIN_TELEGRAM_IDS.includes(telegramId);

    await next();
  } catch (error) {
    logger.error("Ошибка в middleware аутентификации", error);
    await next();
  }
}

/**
 * Middleware для проверки блокировки пользователя
 */
export async function blockCheckMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.from) {
    return;
  }

  try {
    const telegramId = ctx.from.id.toString();
    
    const user = await convexClient.getUserByTelegramId(telegramId);

    if (user?.isBlocked) {
      logger.warn(`Заблокированный пользователь ${telegramId} пытается использовать бота`);
      
      await ctx.reply(
        "Ваш аккаунт заблокирован. Пожалуйста, обратитесь в поддержку для разблокировки."
      );
      
      return;
    }

    await next();
  } catch (error) {
    logger.error("Ошибка в middleware проверки блокировки", error);
    await next();
  }
}

/**
 * Middleware для проверки прав администратора
 */
export function adminRequiredMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  if (!ctx.isAdmin) {
    ctx.reply("У вас нет прав для выполнения этого действия.");
    return Promise.resolve();
  }
  
  return next();
} 