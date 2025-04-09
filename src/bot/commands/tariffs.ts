import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";
import convexClient from "../../services/convex-client";
import vpnService from "../../services/vpn-service";
import { createTariffsKeyboard, createConfirmTariffKeyboard } from "../keyboards";
import { api } from "../../../convex/_generated/api";

const logger = createLogger("command:tariffs");

const composer = new Composer();

composer.command("tariffs", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString();
    
    logger.info(`Пользователь ${telegramId} запросил список тарифов`);
    
    const tariffs = await convexClient.getActivePlans();
    
    if (!tariffs || tariffs.length === 0) {
      await ctx.reply("В данный момент нет доступных тарифов. Пожалуйста, попробуйте позже.");
      return;
    }
    
    const keyboard = createTariffsKeyboard(tariffs);
    
    await ctx.reply(
      `📝 *Выберите тариф VPN*

У нас представлены следующие тарифы VPN для доступа к сервису:

${tariffs.map(tariff => 
  `*${tariff.name}*
  • Трафик: ${tariff.trafficGB} ГБ
  • Период: ${tariff.durationDays} дней
  • Описание: ${tariff.description}
  `).join("\n")}

Выберите подходящий тариф:`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    logger.error("Ошибка в обработчике команды /tariffs", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

// Обработчик текстового сообщения "📝 Выбрать тариф"
composer.hears("📝 Выбрать тариф", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString();
    
    logger.info(`Пользователь ${telegramId} запросил список тарифов через меню`);
    
    // Получаем список активных тарифов
    const tariffs = await convexClient.getActivePlans();
    
    if (!tariffs || tariffs.length === 0) {
      await ctx.reply("В данный момент нет доступных тарифов. Пожалуйста, попробуйте позже.");
      return;
    }
    
    // Создаем клавиатуру с тарифами
    const keyboard = createTariffsKeyboard(tariffs);
    
    // Отправляем сообщение со списком тарифов
    await ctx.reply(
      `📝 *Выберите тариф VPN*

У нас представлены следующие тарифы VPN для доступа к сервису:

${tariffs.map(tariff => 
  `*${tariff.name}*
  • Трафик: ${tariff.trafficGB} ГБ
  • Период: ${tariff.durationDays} дней
  • Описание: ${tariff.description}
  `).join("\n")}

Выберите подходящий тариф:`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    logger.error("Ошибка в обработчике кнопки 'Выбрать тариф'", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

// Обработчик callback запроса "select_tariff"
composer.callbackQuery(/^select_tariff:(.+)$/, async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const tariffId = ctx.match[1];
    
    logger.info(`Пользователь ${telegramId} выбрал тариф ${tariffId}`);
    
    // Получаем информацию о тарифе
    const tariff = await convexClient.query(api.subscriptionPlans.getPlanById, {
      planId: tariffId,
    });
    
    if (!tariff) {
      await ctx.answerCallbackQuery({
        text: "Выбранный тариф недоступен",
        show_alert: true,
      });
      return;
    }
    
    const keyboard = createConfirmTariffKeyboard(tariffId);
    
    await ctx.editMessageText(
      `📋 *Подтверждение выбора тарифа*

Вы выбрали тариф *${tariff.name}*:

• Трафик: ${tariff.trafficGB} ГБ
• Период: ${tariff.durationDays} дней
• Описание: ${tariff.description}

Нажмите "Подтвердить" для получения VPN-доступа.`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error("Ошибка в обработчике callback 'select_tariff'", error);
    
    await ctx.answerCallbackQuery({
      text: "Произошла ошибка при выборе тарифа",
      show_alert: true,
    });
  }
});

// Обработчик callback запроса "confirm_tariff"
composer.callbackQuery(/^confirm_tariff:(.+)$/, async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const tariffId = ctx.match[1];
    
    logger.info(`Пользователь ${telegramId} подтвердил выбор тарифа ${tariffId}`);
    
    await ctx.answerCallbackQuery({
      text: "Создаем VPN-аккаунт...",
    });
    
    const result = await vpnService.createUserVpnAccount(telegramId, tariffId);
    
    await ctx.editMessageText(result, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Ошибка в обработчике callback 'confirm_tariff'", error);
    
    await ctx.answerCallbackQuery({
      text: "Произошла ошибка при создании VPN-аккаунта",
      show_alert: true,
    });
    
    await ctx.editMessageText(
      "Произошла ошибка при создании VPN-аккаунта. Пожалуйста, попробуйте позже или обратитесь в поддержку."
    );
  }
});

// Обработчик callback запроса "cancel_tariff"
composer.callbackQuery("cancel_tariff", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    
    logger.info(`Пользователь ${telegramId} отменил выбор тарифа`);
    
    // Получаем список активных тарифов для возврата к списку
    const tariffs = await convexClient.getActivePlans();
    
    if (!tariffs || tariffs.length === 0) {
      await ctx.editMessageText("В данный момент нет доступных тарифов. Пожалуйста, попробуйте позже.");
      await ctx.answerCallbackQuery();
      return;
    }
    
    const keyboard = createTariffsKeyboard(tariffs);

    await ctx.editMessageText(
      `📝 *Выберите тариф VPN*

Выбор отменен. Вы можете выбрать другой тариф:

${tariffs.map(tariff => 
  `*${tariff.name}*
  • Трафик: ${tariff.trafficGB} ГБ
  • Период: ${tariff.durationDays} дней
  • Описание: ${tariff.description}
  `).join("\n")}

Выберите подходящий тариф:`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error("Ошибка в обработчике callback 'cancel_tariff'", error);
    
    await ctx.answerCallbackQuery({
      text: "Произошла ошибка при отмене выбора",
      show_alert: true,
    });
  }
});

export default composer; 