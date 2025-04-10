import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";
import convexClient from "../../services/convex-client";
import vpnService from "../../services/vpn-service";
import { createTariffsKeyboard, createConfirmTariffKeyboard } from "../keyboards";
import { api } from "../../../convex/_generated/api";

const logger = createLogger("command:tariffs");

const composer = new Composer();

// Обработчик текстового сообщения "📝 Тарифы"
composer.hears("📝 Тарифы", async (ctx) => {
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
      `📝 *Доступные тарифы*

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
    logger.error("Ошибка в обработчике кнопки 'Тарифы'", error);
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
      text: "Обрабатываем запрос...",
    });
    
    // Получаем пользователя
    const user = await convexClient.getUserByTelegramId(telegramId);
    if (!user) {
      await ctx.editMessageText("Ошибка: пользователь не найден. Пожалуйста, свяжитесь с администратором.");
      return;
    }
    
    // Проверяем, есть ли у пользователя VPN-аккаунт
    const vpnAccount = await convexClient.getUserVpnAccount(user._id);
    const existingSubscription = await convexClient.getSubscription(user._id);
    
    let result;
    
    if (vpnAccount && existingSubscription) {
      // Если у пользователя уже есть VPN-аккаунт и подписка
      
      if (vpnAccount.status === "active") {
        // Если аккаунт активен, предлагаем сначала дождаться окончания текущей подписки
        result = "У вас уже есть активная подписка. Дождитесь окончания текущей подписки или израсходования трафика, чтобы выбрать новый тариф.";
      } else {
        // Если аккаунт неактивен (истек срок или закончился трафик), продлеваем или меняем тариф
        
        // Проверяем, тот же ли это тариф или новый
        const isSamePlan = existingSubscription.planId === tariffId;
        
        if (isSamePlan) {
          // Продление текущего тарифа
          result = await vpnService.extendSubscription(telegramId, tariffId);
        } else {
          // Смена тарифа
          result = await vpnService.changeSubscriptionPlan(telegramId, tariffId);
        }
      }
    } else {
      // Если у пользователя нет VPN-аккаунта или подписки, создаем новые
      result = await vpnService.createUserVpnAccount(telegramId, tariffId);
    }
    
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
      "Произошла ошибка при создании или обновлении VPN-аккаунта. Пожалуйста, попробуйте позже или обратитесь в поддержку."
    );
  }
});

// Обработчик callback запроса "back_to_menu" для тарифов
composer.callbackQuery("back_to_menu", async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    
    logger.info(`Пользователь ${telegramId} вернулся в главное меню из тарифов`);
    
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

Выберите подходящий тариф:

${tariffs.map(tariff => 
  `*${tariff.name}*
  • Трафик: ${tariff.trafficGB} ГБ
  • Период: ${tariff.durationDays} дней
  • Описание: ${tariff.description}
  `).join("\n")}`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
    
    await ctx.answerCallbackQuery();
  } catch (error) {
    logger.error("Ошибка при возврате к списку тарифов", error);
    await ctx.answerCallbackQuery({
      text: "Произошла ошибка. Попробуйте позже.",
      show_alert: true,
    });
  }
});

export default composer; 