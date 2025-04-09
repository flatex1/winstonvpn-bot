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

🔍 Используй меню внизу или команды:
• /subscription - информация о подписке
• /connection - данные для подключения
• /tariffs - выбрать тариф
• /help - помощь

Выбери тариф и начни пользоваться VPN прямо сейчас!`,
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
  await ctx.reply(
    `*Как пользоваться ботом*

📝 *Выбор тарифа*:
1. Нажмите "📝 Выбрать тариф" или /tariffs
2. Выберите подходящий тариф из списка
3. Подтвердите выбор

📊 *Просмотр информации о подписке*:
Нажмите "📊 Моя подписка" или /subscription

🔑 *Получение данных для подключения*:
Нажмите "🔑 Данные для подключения" или /connection

📱 *Подключение VPN на устройствах*:
1. Скачайте приложение V2rayNG (Android) или Happ (iOS)
2. Отсканируйте QR-код или скопируйте конфигурацию
3. Сохраните и включите соединение

По любым вопросам обращайтесь в поддержку: @WinstonVPNSupport`,
    {
      parse_mode: "Markdown",
    }
  );
});

export default composer; 