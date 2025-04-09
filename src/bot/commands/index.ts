import { Composer } from "grammy";
import { MyContext } from "../bot";
import startCommand from "./start";
import subscriptionCommand from "./subscription";
import connectionCommand from "./connection";
import tariffsCommand from "./tariffs";
import helpCommand from "./help";

// Создаем композер для всех команд
const composer = new Composer<MyContext>();

// Добавляем все команды
composer.use(startCommand);
composer.use(subscriptionCommand);
composer.use(connectionCommand);
composer.use(tariffsCommand);
composer.use(helpCommand);

// Экспортируем композер
export default composer; 