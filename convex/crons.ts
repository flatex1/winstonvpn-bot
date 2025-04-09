// import { cronJobs } from "convex/server";
// import { internalMutation } from "./_generated/server";
// import { internal } from "./_generated/api";

// // Мутация для проверки статуса подписок (переопределение для использования в cron)
// const checkSubscriptions = internalMutation({
//   args: {},
//   handler: async (ctx) => {
//     return await ctx.runMutation(internal.userSubscriptions.checkSubscriptionStatuses);
//   },
// });

// // Мутация для проверки статуса VPN-аккаунтов (переопределение для использования в cron)
// const checkVpnAccounts = internalMutation({
//   args: {},
//   handler: async (ctx) => {
//     return await ctx.runMutation(internal.vpnAccounts.checkAccountsStatus);
//   },
// });

// // Определение cron задач
// const crons = cronJobs();

// // Запуск проверки подписок каждый час
// crons.interval("check-subscriptions", { hours: 1 }, internal.crons.checkSubscriptions);

// // Запуск проверки VPN-аккаунтов каждый час
// crons.interval("check-vpn-accounts", { hours: 1 }, internal.crons.checkVpnAccounts);

// // Экспортируем cron задачи
// export default crons; 