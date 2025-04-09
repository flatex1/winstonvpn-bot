import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { FunctionReference } from "convex/server";
import { createLogger } from "../utils/logger";
import config from "../utils/config";
import { Id } from "../../convex/_generated/dataModel";

// Создаем логгер для клиента Convex
const logger = createLogger("convex-client");

// Типы для Convex моделей
export interface User {
  _id: Id<"users">;
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  createdAt: number;
  isAdmin: boolean;
  isBlocked: boolean;
}

export interface SubscriptionPlan {
  _id: Id<"subscriptionPlans">;
  _creationTime: number;
  name: string;
  description: string;
  durationDays: number;
  trafficGB: number;
  price: number;
  isActive: boolean;
}

export interface UserSubscription {
  _id: Id<"userSubscriptions">;
  userId: Id<"users">;
  planId: Id<"subscriptionPlans">;
  status: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  plan: SubscriptionPlan;
}

export interface VpnAccount {
  _id: Id<"vpnAccounts">;
  userId: Id<"users">;
  inboundId: number;
  clientId: string;
  email: string;
  expiresAt: number;
  trafficLimit: number;
  trafficUsed: number;
  status: string;
  createdAt: number;
  lastUpdatedAt: number;
  connectionDetails: string;
}

/**
 * Клиент для работы с Convex API
 */
export class ConvexClient {
  private readonly client: ConvexHttpClient;

  constructor() {
    // Инициализируем клиент с URL Convex из конфигурации
    if (config.CONVEX_URL && typeof config.CONVEX_URL === 'string') {
      // Используем CONVEX_URL если он задан
      logger.debug(`Инициализация Convex клиента с URL: ${config.CONVEX_URL}`);
      this.client = new ConvexHttpClient(config.CONVEX_URL);
    } else if (config.CONVEX_DEPLOYMENT && typeof config.CONVEX_DEPLOYMENT === 'string') {
      // Резервный вариант для совместимости
      logger.debug(`Инициализация Convex клиента с DEPLOYMENT: ${config.CONVEX_DEPLOYMENT}`);
      this.client = new ConvexHttpClient(config.CONVEX_DEPLOYMENT);
    } else {
      // Если ни один из вариантов не доступен, выбрасываем ошибку
      throw new Error('Не указаны параметры подключения к Convex (CONVEX_URL или CONVEX_DEPLOYMENT)');
    }
  }

  /**
   * Выполняет запрос к Convex API (query)
   * @param fn Ссылка на функцию Convex
   * @param args Аргументы функции
   * @returns Результат выполнения запроса
   */
  async query<T = any>(
    fn: FunctionReference<"query">,
    args: any
  ): Promise<T> {
    logger.debug(`Выполнение query запроса`, { args });
    try {
      const result = await this.client.query(fn, args);
      logger.debug(`Результат query запроса получен`);
      return result as T;
    } catch (error) {
      logger.error(`Ошибка при выполнении query запроса`, error);
      throw error;
    }
  }

  /**
   * Выполняет мутацию в Convex API (mutation)
   * @param fn Ссылка на функцию Convex
   * @param args Аргументы функции
   * @returns Результат выполнения мутации
   */
  async mutation<T = any>(
    fn: FunctionReference<"mutation">,
    args: any
  ): Promise<T> {
    logger.debug(`Выполнение mutation запроса`, { args });
    try {
      const result = await this.client.mutation(fn, args);
      logger.debug(`Результат mutation запроса получен`);
      return result as T;
    } catch (error) {
      logger.error(`Ошибка при выполнении mutation запроса`, error);
      throw error;
    }
  }

  /**
   * Выполняет действие в Convex API (action)
   * @param fn Ссылка на функцию Convex
   * @param args Аргументы функции
   * @returns Результат выполнения действия
   */
  async action<T = any>(
    fn: FunctionReference<"action">,
    args: any
  ): Promise<T> {
    logger.debug(`Выполнение action запроса`, args);
    
    // Отладка для createVpnAccount
    if (fn === api.vpnAccountActions.createVpnAccount) {
      console.log(`Вызов createVpnAccount с аргументами:`, JSON.stringify(args, null, 2));
      logger.info(`Вызов createVpnAccount с аргументами:`, args);
      
      if (!args.userSubscriptionId) {
        logger.error(`Отсутствует обязательный параметр userSubscriptionId!`);
        logger.error(`Полученные аргументы:`, args);
        console.error("ОШИБКА: Отсутствует обязательный параметр userSubscriptionId!", args);
        
        // Попытка исправить ошибку
        if (args.subscriptionId) {
          logger.info(`Обнаружен параметр subscriptionId, используем его как userSubscriptionId`);
          args.userSubscriptionId = args.subscriptionId;
        }
      }
    }
    
    try {
      const result = await this.client.action(fn, args);
      logger.debug(`Результат action запроса получен`);
      return result as T;
    } catch (error) {
      logger.error(`Ошибка при выполнении action запроса`, error);
      throw error;
    }
  }

  // Вспомогательные методы для работы с пользователями

  /**
   * Создает или обновляет пользователя
   * @param telegramId ID пользователя в Telegram
   * @param username Имя пользователя в Telegram
   * @param firstName Имя пользователя
   * @param lastName Фамилия пользователя
   * @returns ID пользователя в Convex
   */
  async createOrUpdateUser(
    telegramId: string,
    username?: string,
    firstName?: string,
    lastName?: string
  ): Promise<Id<"users">> {
    return await this.mutation<Id<"users">>(api.users.createOrUpdateUser, {
      telegramId,
      username,
      firstName: firstName || "Пользователь",
      lastName,
    });
  }

  /**
   * Получает пользователя по Telegram ID
   * @param telegramId ID пользователя в Telegram
   * @returns Данные пользователя или null
   */
  async getUserByTelegramId(telegramId: string): Promise<User | null> {
    return await this.query<User | null>(api.users.getUserByTelegramId, {
      telegramId,
    });
  }

  // Методы для работы с подписками

  /**
   * Получает все активные тарифы
   * @returns Список активных тарифов
   */
  async getActivePlans(): Promise<SubscriptionPlan[]> {
    return await this.query<SubscriptionPlan[]>(api.subscriptionPlans.getActivePlans, {});
  }

  /**
   * Инициализирует базовые тарифы в системе
   * @returns Результат инициализации
   */
  async initializeDefaultPlans(): Promise<{ success: boolean; message: string }> {
    return await this.mutation<{ success: boolean; message: string }>(
      api.subscriptionPlans.initializeDefaultPlans, 
      {}
    );
  }

  /**
   * Создает бесплатную подписку для пользователя
   * @param userId ID пользователя в Convex
   * @param planId ID тарифа
   * @returns ID созданной подписки
   */
  async createFreeSubscription(
    userId: Id<"users">,
    planId: Id<"subscriptionPlans">
  ): Promise<Id<"userSubscriptions">> {
    return await this.mutation<Id<"userSubscriptions">>(api.userSubscriptions.createFreeSubscription, {
      userId,
      planId,
    });
  }

  /**
   * Получает активную подписку пользователя
   * @param userId ID пользователя в Convex
   * @returns Данные подписки или null
   */
  async getActiveSubscription(userId: Id<"users">): Promise<UserSubscription | null> {
    return await this.query<UserSubscription | null>(api.userSubscriptions.getActiveSubscription, {
      userId,
    });
  }

  // Методы для работы с VPN-аккаунтами

  /**
   * Создает VPN-аккаунт для пользователя
   * @param userId ID пользователя в Convex
   * @param userSubscriptionId ID подписки пользователя
   * @param inboundId ID inbound сервера в 3x-ui
   * @returns Данные VPN-аккаунта
   */
  async createVpnAccount(
    userId: Id<"users">,
    userSubscriptionId: Id<"userSubscriptions">,
    inboundId: number
  ): Promise<VpnAccount | null> {
    console.log("createVpnAccount called with params:", JSON.stringify({
      userId,
      userSubscriptionId,
      inboundId
    }, null, 2));
    
    if (!userSubscriptionId) {
      logger.error("Обязательный параметр userSubscriptionId не передан!");
      throw new Error("Отсутствует обязательный параметр userSubscriptionId");
    }
    
    return await this.action<VpnAccount | null>(api.vpnAccountActions.createVpnAccount, {
      userId,
      userSubscriptionId,
      inboundId,
    });
  }

  /**
   * Получает VPN-аккаунт пользователя
   * @param userId ID пользователя в Convex
   * @returns Данные VPN-аккаунта или null
   */
  async getUserVpnAccount(userId: Id<"users">): Promise<VpnAccount | null> {
    return await this.query<VpnAccount | null>(api.vpnAccounts.getUserVpnAccount, {
      userId,
    });
  }

  /**
   * Обновляет статистику использования трафика
   * @param email Email VPN-аккаунта
   * @returns Обновленные данные аккаунта
   */
  async updateTrafficUsage(email: string): Promise<VpnAccount | null> {
    return await this.action<VpnAccount | null>(api.vpnAccountActions.updateTrafficUsage, {
      email,
    });
  }
}

// Экспортируем экземпляр клиента для использования в проекте
export const convexClient = new ConvexClient();

// Экспортируем клиент по умолчанию
export default convexClient; 