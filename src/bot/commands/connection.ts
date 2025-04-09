import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";
import vpnService from "../../services/vpn-service";
import { viewConnectionKeyboard } from "../keyboards";

const logger = createLogger("command:connection");

const composer = new Composer();

composer.command("connection", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString();
    
    logger.info(`Пользователь ${telegramId} запросил данные для подключения`);
    
    const message = await vpnService.getConnectionDetails(telegramId!);
    
    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: viewConnectionKeyboard,
    });
  } catch (error) {
    logger.error("Ошибка в обработчике команды /connection", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

// Обработчик текстового сообщения "🔑 Данные для подключения"
composer.hears("🔑 Данные для подключения", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString();
    
    logger.info(`Пользователь ${telegramId} запросил данные для подключения через меню`);
    
    const message = await vpnService.getConnectionDetails(telegramId!);
    
    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: viewConnectionKeyboard,
    });
  } catch (error) {
    logger.error("Ошибка в обработчике кнопки 'Данные для подключения'", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

// Обработчик callback запроса "refresh_connection"
composer.callbackQuery("refresh_connection", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    
    logger.info(`Пользователь ${telegramId} обновляет данные для подключения`);
    
    await ctx.answerCallbackQuery({
      text: "Обновляем данные...",
    });
    
    const message = await vpnService.getConnectionDetails(telegramId);
    
    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: viewConnectionKeyboard,
    });
  } catch (error) {
    logger.error("Ошибка в обработчике callback 'refresh_connection'", error);
    
    await ctx.answerCallbackQuery({
      text: "Произошла ошибка при обновлении данных",
      show_alert: true,
    });
  }
});

export default composer; 