import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";
import { instructionsKeyboard, mainKeyboard } from "../keyboards";

const logger = createLogger("command:instructions");

const composer = new Composer();

// Обработчик кнопки "📱 Инструкция"
composer.hears("📱 Инструкция", async (ctx) => {
  try {
    await ctx.reply(
      "Выберите вашу операционную систему для получения инструкции по подключению:",
      {
        reply_markup: instructionsKeyboard,
      }
    );
  } catch (error) {
    logger.error("Ошибка при показе меню инструкций", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

// Инструкция для Windows
composer.callbackQuery("instruction_windows", async (ctx) => {
  try {
    await ctx.editMessageText(
      `*Инструкция по подключению на Windows*

1. Скачайте и установите NekoBox для Windows:
   • [Скачать NekoBox](https://github.com/MatsuriDayo/nekoray/releases)
   • Выберите файл \`nekobox-\*-windows64.zip\`

2. Настройка подключения:
   • В боте нажмите "🔑 Данные для подключения" и скопируйте конфигурацию
   • Откройте NekoBox
   • Нажмите "Программа" в верхнем меню
   • Выберите "Добавить профиль из буфера обмена"

3. Запуск VPN:
   • Выберите добавленный профиль в списке (ПКМ -> Запустить)
   • Поставьте галочку в чекбоксе "Режим TUN"
   • Разрешите доступ к сети, если Windows запросит

*Готово!* Ваше VPN-соединение активно.

💡 *Примечание*: При первом запуске может потребоваться установка дополнительных компонентов. Следуйте инструкциям программы.`,
      {
        parse_mode: "Markdown",
        reply_markup: instructionsKeyboard,
      }
    );
  } catch (error) {
    logger.error("Ошибка при показе инструкции для Windows", error);
    await ctx.answerCallbackQuery("Произошла ошибка. Попробуйте еще раз.");
  }
});

// Инструкция для Android
composer.callbackQuery("instruction_android", async (ctx) => {
  try {
    await ctx.editMessageText(
      `*Инструкция по подключению на Android*

1. Установите приложение V2rayNG из Google Play Store
2. Откройте бота и нажмите "🔑 Данные для подключения"
3. Нажмите кнопку "Скопировать" под конфигурацией
4. Откройте V2rayNG и нажмите + -> Импорт из буфера обмена
5. Выберите импортированный сервер
6. Нажмите кнопку подключения (круг внизу экрана)

*Готово!* Ваше VPN-соединение активно.`,
      {
        parse_mode: "Markdown",
        reply_markup: instructionsKeyboard,
      }
    );
  } catch (error) {
    logger.error("Ошибка при показе инструкции для Android", error);
    await ctx.answerCallbackQuery("Произошла ошибка. Попробуйте еще раз.");
  }
});

// Инструкция для iOS
composer.callbackQuery("instruction_ios", async (ctx) => {
  try {
    await ctx.editMessageText(
      `*Инструкция по подключению на iOS*

1. Установите приложение Happ из App Store
2. Откройте бота и нажмите "🔑 Данные для подключения"
3. Cкопируйте конфигурацию и импортируйте вручную через "+ -> Вставить из буфера обмена"
4. В приложении Happ выберите импортированный сервер
5. Включите VPN переключателем в приложении

*Готово!* Ваше VPN-соединение активно.`,
      {
        parse_mode: "Markdown",
        reply_markup: instructionsKeyboard,
      }
    );
  } catch (error) {
    logger.error("Ошибка при показе инструкции для iOS", error);
    await ctx.answerCallbackQuery("Произошла ошибка. Попробуйте еще раз.");
  }
});

// Возврат в главное меню
composer.callbackQuery("back_to_menu", async (ctx) => {
  try {
    await ctx.answerCallbackQuery();
    await ctx.deleteMessage();
    
    await ctx.reply(
      "Главное меню:",
      {
        reply_markup: mainKeyboard,
      }
    );
  } catch (error) {
    logger.error("Ошибка при возврате в главное меню", error);
    await ctx.answerCallbackQuery({
      text: "Произошла ошибка. Попробуйте еще раз.",
      show_alert: true,
    });
  }
});

export default composer; 