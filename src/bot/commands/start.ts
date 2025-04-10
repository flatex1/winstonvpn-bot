import { Composer } from "grammy";
import { mainKeyboard } from "../keyboards";
import { createLogger } from "../../utils/logger";
import convexClient from "../../services/convex-client";

const logger = createLogger("command:start");

const composer = new Composer();

composer.command("start", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString();
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;
    const lastName = ctx.from?.last_name;

    logger.info(`Пользователь ${telegramId} запустил бота`);

    await convexClient.createOrUpdateUser(
      telegramId!,
      username,
      firstName ?? "",
      lastName ?? ""
    );

    await ctx.reply(
      `👋 Привет, ${firstName}!

Добро пожаловать в Winston VPN - твой личный проводник в мир свободного интернета.

🚀 *Что я умею*:
• Выдавать VPN-подписки
• Показывать статистику использования
• Предоставлять данные для подключения

Используйте кнопки меню внизу для навигации:
• 📊 Моя подписка
• 🔑 Данные для подключения
• 📝 Выбрать тариф
• 📱 Инструкция
• ❓ Помощь

Выберите тариф и начните пользоваться VPN прямо сейчас!`,
      {
        parse_mode: "Markdown",
        reply_markup: mainKeyboard,
      }
    );
  } catch (error) {
    logger.error("Ошибка в обработчике команды /start", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

// Обработчик текстового сообщения "🔍 О боте"
composer.hears("🔍 О боте", async (ctx) => {
  await ctx.reply(
    `*WinstonVPN Bot*

Версия: 1.0.1
Разработчик: @liquid00

Этот бот предоставляет доступ к VPN-сервису на базе протокола VLESS + XTLS.
Надежное и быстрое соединение для обхода блокировок.

Для получения помощи используйте команду /help или напишите нам в поддержку.`,
    {
      parse_mode: "Markdown",
    }
  );
});

// Обработчик текстового сообщения "❓ Помощь"
composer.hears("❓ Помощь", async (ctx) => {
  try {
    await ctx.reply(
      `*Как пользоваться ботом*

📝 *Выбор тарифа*:
1. Нажмите кнопку "📝 Выбрать тариф" в главном меню
2. Выберите подходящий тариф из списка
3. Подтвердите выбор

📊 *Просмотр информации о подписке*:
Нажмите кнопку "📊 Моя подписка" в главном меню

🔑 *Получение данных для подключения*:
Нажмите кнопку "🔑 Данные для подключения" в главном меню

📱 *Инструкция по подключению*:
1. Нажмите кнопку "📱 Инструкция" в главном меню
2. Выберите вашу операционную систему
3. Следуйте пошаговой инструкции

💬 *Поддержка*:
Если у вас возникли вопросы, нажмите кнопку "💬 Поддержка"`,
      {
        parse_mode: "Markdown",
        reply_markup: mainKeyboard,
      }
    );
  } catch (error) {
    logger.error("Ошибка в обработчике кнопки 'Помощь'", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

// Обработчик текстового сообщения "💬 Поддержка"
composer.hears("💬 Поддержка", async (ctx) => {
  try {
    await ctx.reply(
      `*Поддержка WinstonVPN*

Если у вас возникли вопросы или проблемы, напишите нам: @WinstonVPNSupport

Мы поможем вам:
• Настроить VPN на вашем устройстве
• Решить проблемы с подключением
• Ответить на любые вопросы о работе сервиса

Время работы поддержки: ежедневно с 9:00 до 21:00 МСК`,
      {
        parse_mode: "Markdown",
        reply_markup: mainKeyboard,
      }
    );
  } catch (error) {
    logger.error("Ошибка в обработчике кнопки 'Поддержка'", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

export default composer; 