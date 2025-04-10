import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";
import vpnService from "../../services/vpn-service";
import { viewConnectionKeyboard, instructionsKeyboard } from "../keyboards";

const logger = createLogger("command:connection");

const composer = new Composer();

async function sendConnectionDetails(ctx: any, source: string) {
  try {
    const telegramId = ctx.from?.id.toString();
    
    logger.info(`Пользователь ${telegramId} запросил данные для подключения через ${source}`);
    
    const message = await vpnService.getConnectionDetails(telegramId!);
    
    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: viewConnectionKeyboard,
    });
  } catch (error) {
    logger.error(`Ошибка при получении данных для подключения (${source})`, error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
}

// Обработчик команды /connection
composer.command("connection", async (ctx) => {
  await sendConnectionDetails(ctx, "команду");
});

// Обработчик кнопки "🔑 Данные для подключения"
composer.hears("🔑 Данные для подключения", async (ctx) => {
  await sendConnectionDetails(ctx, "кнопку меню");
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

// Обработчик кнопки "📱 Инструкция по подключению"
composer.callbackQuery("show_instructions", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    
    logger.info(`Пользователь ${telegramId} запросил инструкцию по подключению`);
    
    await ctx.editMessageText(
      "Выберите вашу операционную систему для получения инструкции по подключению:",
      {
        reply_markup: instructionsKeyboard,
      }
    );
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error("Ошибка при показе меню инструкций", error);
    await ctx.answerCallbackQuery({
      text: "Произошла ошибка. Попробуйте позже.",
      show_alert: true,
    });
  }
});

export default composer; 