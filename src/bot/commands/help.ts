import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";
import { mainKeyboard } from "../keyboards";

const logger = createLogger("command:help");

const composer = new Composer();

composer.command("help", async (ctx) => {
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
    logger.error("Ошибка в обработчике команды /help", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

export default composer; 