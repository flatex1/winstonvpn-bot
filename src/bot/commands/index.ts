import { Composer } from "grammy";
import { MyContext } from "../bot";
import startCommand from "./start";
import profileCommand from "./profile";
import tariffsCommand from "./tariffs";
import connectionCommand from "./connection";
import instructionsCommand from "./instructions";

const composer = new Composer<MyContext>();

composer.use(startCommand);
composer.use(profileCommand);
composer.use(tariffsCommand);
composer.use(connectionCommand);
composer.use(instructionsCommand);

export default composer; 