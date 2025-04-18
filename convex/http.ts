import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Bot } from "grammy";

const http = httpRouter();

// Эндпоинт для обработки вебхуков от Telegram
http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const update = await request.json();
      
      if (!update || !update.update_id) {
        return new Response("Invalid update", { status: 400 });
      }
      
      const token = process.env.BOT_TOKEN;
      if (!token) {
        return new Response("Bot token not configured", { status: 500 });
      }
      
      const bot = new Bot(token);
      
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

// TODO: сделать функциональность для проверки здоровья сервиса
// http.route({
//   path: "/health",
//   method: "GET",
//   handler: httpAction(async (ctx, request) => {
//     return new Response(
//       JSON.stringify({
//         status: "ok",
//         timestamp: new Date().toISOString(),
//       }),
//       {
//         status: 200,
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );
//   }),
// });

export default http; 