import { Composer } from "grammy";
import { MyContext } from "../bot";
import startCommand from "./start";
import subscriptionCommand from "./subscription";
import connectionCommand from "./connection";
import tariffsCommand from "./tariffs";
import helpCommand from "./help";

const composer = new Composer<MyContext>();

composer.use(startCommand);
composer.use(subscriptionCommand);
composer.use(connectionCommand);
composer.use(tariffsCommand);
composer.use(helpCommand);

export default composer; 