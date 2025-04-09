import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";

// Создаем логгер для модуля
const logger = createLogger("command:help");

// Создаем композер для обработки команды /help
const composer = new Composer();

// Обработчик команды /help
composer.command("help", async (ctx) => {
  try {
    // Отправляем сообщение с помощью
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
1. Скачайте приложение V2rayNG (Android) или Shadowrocket (iOS)
2. Отсканируйте QR-код или скопируйте конфигурацию
3. Сохраните и включите соединение

По любым вопросам обращайтесь в поддержку: @WinstonVPNSupport`,
      {
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    logger.error("Ошибка в обработчике команды /help", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

// Экспортируем композер
export default composer; 