import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";
import vpnService from "../../services/vpn-service";
import { viewConnectionKeyboard } from "../keyboards";

// Создаем логгер для модуля
const logger = createLogger("command:connection");

// Создаем композер для обработки команды /connection
const composer = new Composer();

// Обработчик команды /connection
composer.command("connection", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString();
    
    logger.info(`Пользователь ${telegramId} запросил данные для подключения`);
    
    // Получаем данные для подключения
    const message = await vpnService.getConnectionDetails(telegramId!);
    
    // Отправляем сообщение с данными
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
    
    // Получаем данные для подключения
    const message = await vpnService.getConnectionDetails(telegramId!);
    
    // Отправляем сообщение с данными
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
    
    // Уведомляем о процессе
    await ctx.answerCallbackQuery({
      text: "Обновляем данные...",
    });
    
    // Получаем обновленные данные для подключения
    const message = await vpnService.getConnectionDetails(telegramId);
    
    // Обновляем сообщение с данными
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

// Экспортируем композер
export default composer; 