import { Bot, session, GrammyError, HttpError, Context, SessionFlavor, RawApi } from "grammy";
import { createLogger } from "../utils/logger";
import config from "../utils/config";
import commands from "./commands";
import { authMiddleware, blockCheckMiddleware } from "./middlewares";

const logger = createLogger("telegram-bot");

interface SessionData {}

export interface MyContext extends Context, SessionFlavor<SessionData> {
  user: any; // Пользователь из Convex
  isAdmin: boolean;
}

export const bot = new Bot<MyContext>(config.BOT_TOKEN);

bot.use(session({
  initial: () => ({}),
}));

bot.use(authMiddleware);
bot.use(blockCheckMiddleware);

bot.use(commands);

bot.command(["*"], async (ctx) => {
  await ctx.reply("Неизвестная команда. Используйте /help для получения списка доступных команд.");
});

bot.catch((err) => {
  const ctx = err.ctx;
  logger.error(`Ошибка при обработке ${ctx.update.update_id}:`, err.error);
  
  if (err.error instanceof GrammyError) {
    logger.error("Ошибка API Telegram:", err.error);
  } else if (err.error instanceof HttpError) {
    logger.error("Ошибка при обращении к Telegram:", err.error);
  } else {
    logger.error("Неизвестная ошибка:", err.error);
  }
});

export async function startBot() {
  try {
    logger.info("Запуск бота...");
    
    if (config.PUBLIC_URL && config.NODE_ENV === "production") {
      // В production режиме используем webhook
      logger.info(`Установка webhook на ${config.PUBLIC_URL}/api/webhook`);
      await bot.api.setWebhook(`${config.PUBLIC_URL}/api/webhook`);
    } else {
      // В режиме разработки используем long polling
      logger.info("Запуск бота в режиме long polling");
      await bot.start();
    }
    
    logger.info("Бот успешно запущен!");
  } catch (error) {
    logger.error("Ошибка при запуске бота:", error);
    throw error;
  }
}

export default { bot, startBot }; 