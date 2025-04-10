import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";
import vpnService from "../../services/vpn-service";
import convexClient from "../../services/convex-client";
import { profileKeyboard, viewConnectionKeyboard } from "../keyboards";

const logger = createLogger("command:profile");

const composer = new Composer();

async function sendProfileInfo(ctx: any, source: string) {
  try {
    const telegramId = ctx.from?.id.toString() ?? "";

    logger.info(
      `Пользователь ${telegramId} запросил информацию профиля через ${source}`
    );

    // Получаем информацию о пользователе
    const user = await convexClient.getUserByTelegramId(telegramId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }

    // Получаем статистику VPN
    const vpnStats = await vpnService.getUserVpnStats(telegramId);

    const message = `👤 *Ваш профиль*

🆔 ID: \`${telegramId}\`
${user.username && `👤 Username: @${user.username}`}

${vpnStats}`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: profileKeyboard,
    });
  } catch (error) {
    logger.error(`Ошибка при получении информации профиля (${source})`, error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
}

// Обработчик кнопки "👤 Профиль"
composer.hears("👤 Профиль", async (ctx) => {
  await sendProfileInfo(ctx, "кнопку меню");
});

// Обработчик кнопки обновления статистики
composer.callbackQuery("refresh_stats", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();

    logger.info(`Пользователь ${telegramId} обновляет статистику`);

    await ctx.answerCallbackQuery({
      text: "Обновляем статистику...",
    });

    // Получаем информацию о пользователе
    const user = await convexClient.getUserByTelegramId(telegramId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }

    // Получаем статистику VPN
    const vpnStats = await vpnService.getUserVpnStats(telegramId);

    const message = `👤 *Ваш профиль*

🆔 ID: \`${telegramId}\`
${user.username && `👤 Username: @${user.username}`}
📅 Регистрация: ${new Date(user.createdAt).toLocaleDateString("ru-RU")}

${vpnStats}`;

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: profileKeyboard,
    });
  } catch (error) {
    logger.error("Ошибка при обновлении статистики", error);
    await ctx.answerCallbackQuery({
      text: "Произошла ошибка при обновлении статистики",
      show_alert: true,
    });
  }
});

// Обработчик возврата в профиль
composer.callbackQuery("back_to_profile", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();

    logger.info(`Пользователь ${telegramId} возвращается в профиль`);

    await ctx.answerCallbackQuery();

    // Получаем информацию о пользователе
    const user = await convexClient.getUserByTelegramId(telegramId);
    if (!user) {
      throw new Error("Пользователь не найден");
    }

    // Получаем статистику VPN
    const vpnStats = await vpnService.getUserVpnStats(telegramId);

    const message = `👤 *Ваш профиль*

🆔 ID: \`${telegramId}\`
${user.username && `👤 Username: @${user.username}`}

${vpnStats}`;

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: profileKeyboard,
    });
  } catch (error) {
    logger.error("Ошибка при возврате в профиль", error);
    await ctx.answerCallbackQuery({
      text: "Произошла ошибка. Попробуйте еще раз.",
      show_alert: true,
    });
  }
});

// Обработчик кнопки "show_connection"
composer.callbackQuery("show_connection", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();

    logger.info(
      `Пользователь ${telegramId} запросил данные для подключения из профиля`
    );

    const message = await vpnService.getConnectionDetails(telegramId);

    await ctx.editMessageText(message, {
      parse_mode: "Markdown",
      reply_markup: viewConnectionKeyboard,
    });

    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error("Ошибка при получении данных для подключения", error);
    await ctx.answerCallbackQuery({
      text: "Произошла ошибка при получении данных для подключения",
      show_alert: true,
    });
  }
});

export default composer;
