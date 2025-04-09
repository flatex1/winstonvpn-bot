import { Composer } from "grammy";
import { createLogger } from "../../utils/logger";
import vpnService from "../../services/vpn-service";

const logger = createLogger("command:subscription");

const composer = new Composer();

composer.command("subscription", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString() ?? '';
    
    logger.info(`Пользователь ${telegramId} запросил информацию о подписке`);
    
    const message = await vpnService.getUserVpnStats(telegramId);
    
    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Ошибка в обработчике команды /subscription", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

composer.hears("📊 Моя подписка", async (ctx) => {
  try {
    const telegramId = ctx.from?.id.toString() ?? '';
    
    logger.info(`Пользователь ${telegramId} запросил информацию о подписке через меню`);
    
    const message = await vpnService.getUserVpnStats(telegramId);
    
    await ctx.reply(message, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error("Ошибка в обработчике кнопки 'Моя подписка'", error);
    await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте еще раз.");
  }
});

export default composer; 