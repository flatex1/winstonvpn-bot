import { startBot } from "./bot/bot";
import { createLogger } from "./utils/logger";

// Создаем логгер для основного файла
const logger = createLogger("main");

async function main() {
  try {
    logger.info("Запуск WinstonVPN бота...");
    await startBot();
    
    // Обработка сигнала завершения
    process.on("SIGINT", () => {
      logger.info("Получен сигнал завершения, останавливаем бота...");
      process.exit(0);
    });
    
    process.on("SIGTERM", () => {
      logger.info("Получен сигнал завершения, останавливаем бота...");
      process.exit(0);
    });
    
    logger.info("Бот успешно запущен и работает");
  } catch (error) {
    logger.error("Ошибка при запуске бота:", error);
    process.exit(1);
  }
}

// Запускаем приложение
main().catch((error) => {
  console.error("Критическая ошибка:", error);
  process.exit(1);
}); 