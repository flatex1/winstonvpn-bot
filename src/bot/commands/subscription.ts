import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";
import vpnService from "../../services/vpn-service";

// Создаем логгер для модуля
const logger = createLogger("command:subscription");

// Создаем композер для обработки команды /subscription
const composer = new Composer();

// Обработчик команды /subscription
composer.command("subscription", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString() ?? '';
    
    logger.info(`Пользователь ${telegramId} запросил информацию о подписке`);
    
    // Получаем информацию о подписке и VPN-аккаунте
    const message = await vpnService.getUserVpnStats(telegramId);
    
    // Отправляем сообщение с информацией
    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Ошибка в обработчике команды /subscription", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

// Обработчик текстового сообщения "📊 Моя подписка"
composer.hears("📊 Моя подписка", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString() ?? '';
    
    logger.info(`Пользователь ${telegramId} запросил информацию о подписке через меню`);
    
    // Получаем информацию о подписке и VPN-аккаунте
    const message = await vpnService.getUserVpnStats(telegramId);
    
    // Отправляем сообщение с информацией
    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Ошибка в обработчике кнопки 'Моя подписка'", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

// Экспортируем композер
export default composer; 