import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Bot } from "grammy";

// Создаем router для HTTP эндпоинтов
const http = httpRouter();

// Эндпоинт для обработки вебхуков от Telegram
http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Получаем данные обновления
      const update = await request.json();
      
      // Проверяем, что это валидное обновление от Telegram
      if (!update || !update.update_id) {
        return new Response("Invalid update", { status: 400 });
      }
      
      // Получаем токен из переменных окружения
      const token = process.env.BOT_TOKEN;
      if (!token) {
        return new Response("Bot token not configured", { status: 500 });
      }
      
      // Создаем экземпляр бота для обработки обновления
      const bot = new Bot(token);
      
      // Обрабатываем обновление
      await bot.handleUpdate(update);
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Error handling webhook:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// Эндпоинт для проверки здоровья сервиса
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

// Экспортируем HTTP router
export default http; 