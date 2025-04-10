import { XuiClient } from "../api/xui-client";
import { createLogger } from "../utils/logger";
import config from "../utils/config";
import convexClient from "./convex-client";
import { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";

// Создаем логгер для VPN сервиса
const logger = createLogger("vpn-service");

// Типы данных, соответствующие типам в Convex
interface ConvexUser {
  _id: Id<"users">;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  createdAt: number;
  isAdmin: boolean;
  isBlocked: boolean;
}

interface ConvexSubscriptionPlan {
  _id: Id<"subscriptionPlans">;
  name: string;
  trafficGB: number;
  durationDays: number;
  price: number;
  isActive: boolean;
}

interface ConvexSubscription {
  _id: Id<"userSubscriptions">;
  userId: Id<"users">;
  planId: Id<"subscriptionPlans">;
  status: string;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
  plan: ConvexSubscriptionPlan;
}

interface ConvexVpnAccount {
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
 * Сервис для работы с VPN через 3x-ui API
 */
export class VpnService {
  private readonly xuiClient: XuiClient;

  constructor() {
    // Инициализируем клиент 3x-ui API
    this.xuiClient = new XuiClient(
      config.XUI_API_URL,
      config.XUI_API_USERNAME,
      config.XUI_API_PASSWORD
    );
  }

  /**
   * Форматирует статистику трафика в человекочитаемом виде
   * @param bytes Размер в байтах
   * @returns Отформатированная строка
   */
  static formatTraffic(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }

  /**
   * Форматирует дату истечения в человекочитаемом виде
   * @param timestamp Timestamp в миллисекундах
   * @returns Отформатированная строка
   */
  static formatExpiryDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Получает статистику использования VPN для пользователя
   * @param telegramId ID пользователя в Telegram
   * @returns Строка с информацией о статистике или сообщение об ошибке
   */
  async getUserVpnStats(telegramId: string): Promise<string> {
    try {
      // Получаем пользователя из Convex
      const user = await convexClient.getUserByTelegramId(telegramId) as ConvexUser;
      if (!user) {
        return "Пользователь не найден";
      }

      // Получаем подписку пользователя
      const subscription = await convexClient.getActiveSubscription(user._id) as ConvexSubscription;
      if (!subscription) {
        return "У вас нет активной подписки.";
      }

      // Получаем VPN-аккаунт пользователя
      const vpnAccount = await convexClient.getUserVpnAccount(user._id) as ConvexVpnAccount;
      if (!vpnAccount) {
        return "У вас нет VPN-аккаунта.";
      }

      // Обновляем статистику использования VPN
      const updatedAccount = await convexClient.updateVpnAccountStats(vpnAccount._id) as ConvexVpnAccount;
      
      // Формируем ответ с информацией о VPN-аккаунте
      const trafficUsed = VpnService.formatTraffic(updatedAccount.trafficUsed);
      const trafficLimit = VpnService.formatTraffic(updatedAccount.trafficLimit);
      const trafficPercentage = Math.round((updatedAccount.trafficUsed / updatedAccount.trafficLimit) * 100);
      const expiryDate = VpnService.formatExpiryDate(updatedAccount.expiresAt);
      
      const statusMap: Record<string, string> = {
        active: "Активен",
        inactive: "Неактивен",
        expired: "Истек",
        blocked: "Заблокирован"
      };

      let message = `📊 *Информация о VPN-подписке*

🔹 *Тариф*: ${subscription.plan.name}
🔹 *Статус*: ${statusMap[updatedAccount.status] || updatedAccount.status}
🔹 *Действует до*: ${expiryDate}
🔹 *Трафик*: ${trafficUsed} из ${trafficLimit} (${trafficPercentage}%)`;

      const isInactive = updatedAccount.status === "inactive" || updatedAccount.status === "expired";
      const isTrafficExceeded = updatedAccount.trafficUsed >= updatedAccount.trafficLimit;
      const isExpired = Date.now() > updatedAccount.expiresAt;
      
      isInactive && (
        isTrafficExceeded && (message += `\n\n⚠️ *Ваш трафик исчерпан*. Выберите новый тариф или продлите текущий.`) ||
        isExpired && (message += `\n\n⚠️ *Срок действия вашей подписки истек*. Выберите новый тариф или продлите текущий.`)
      );

      return message;
    } catch (error) {
      logger.error("Ошибка получения статистики VPN", error);
      return "Произошла ошибка при получении статистики VPN";
    }
  }

  /**
   * Получает данные для подключения к VPN
   * @param telegramId ID пользователя в Telegram
   * @returns Строка с данными для подключения или сообщение об ошибке
   */
  async getConnectionDetails(telegramId: string): Promise<string> {
    try {
      // Получаем пользователя из Convex
      const user = await convexClient.getUserByTelegramId(telegramId) as ConvexUser;
      if (!user) {
        return "Пользователь не найден";
      }

      // Получаем VPN-аккаунт пользователя
      const vpnAccount = await convexClient.getUserVpnAccount(user._id) as ConvexVpnAccount;
      if (!vpnAccount) {
        return "У вас нет активного VPN-аккаунта";
      }

      if (vpnAccount.status !== "active") {
        return "Ваш VPN-аккаунт не активен. Приобретите новую подписку.";
      }

      // Возвращаем строку подключения
      return `🔐 *Данные для подключения к VPN*

Воспользуйтесь инструкцией для подключения VPN на вашем устройстве.

📋 *Ваша конфигурация*:
\`\`\`
${vpnAccount.connectionDetails}
\`\`\``;
    } catch (error) {
      logger.error("Ошибка получения данных подключения", error);
      return "Произошла ошибка при получении данных для подключения";
    }
  }

  /**
   * Создает VPN-аккаунт для пользователя
   * @param telegramId ID пользователя в Telegram
   * @param subscriptionPlanId ID тарифа
   * @returns Сообщение о результате операции
   */
  async createUserVpnAccount(telegramId: string, subscriptionPlanId: string): Promise<string> {
    try {
      
      // Получаем пользователя из Convex
      const user = await convexClient.getUserByTelegramId(telegramId) as ConvexUser;
      if (!user) {
        return "Пользователь не найден";
      }
      
      // Проверяем, есть ли уже активная подписка
      const existingSubscription = await convexClient.getActiveSubscription(user._id) as ConvexSubscription;
      if (existingSubscription) {
        return "У вас уже есть активная подписка! Воспользуйтесь командой /subscription для просмотра информации.";
      }
      
      // Создаем подписку (бесплатно)
      const subscriptionId = await convexClient.createFreeSubscription(
        user._id,
        subscriptionPlanId as Id<"subscriptionPlans">
      );
      
      // Получаем полные данные о подписке
      const subscription = await convexClient.getActiveSubscription(user._id) as ConvexSubscription;
      if (!subscription) {
        throw new Error("Не удалось получить созданную подписку");
      }

      // Создаем VPN-аккаунт
      const inboundId = Number(config.XUI_DEFAULT_INBOUND_ID);
      if (isNaN(inboundId)) {
        throw new Error("Некорректный ID для входящего соединения");
      }

      if (!subscription._id) {
        logger.error("Отсутствует subscription._id! Полная подписка:", subscription);
        throw new Error("ID подписки отсутствует");
      }

      logger.info("Вызов createVpnAccount с параметрами:", {
        userId: user._id,
        userSubscriptionId: subscription._id,
        inboundId
      });

      const vpnAccount = await convexClient.createVpnAccount(
        user._id,
        subscription._id,
        inboundId
      );

      if (!vpnAccount) {
        return "Не удалось создать VPN-аккаунт. Пожалуйста, обратитесь в поддержку.";
      }

      return `✅ VPN-аккаунт успешно создан!

Для просмотра статистики используйте кнопку "📊 Моя подписка"
Для получения данных подключения используйте кнопку "🔑 Данные для подключения"`;
    } catch (error) {
      logger.error("Ошибка создания VPN-аккаунта", error);
      return "Произошла ошибка при создании VPN-аккаунта. Пожалуйста, обратитесь в поддержку.";
    }
  }

  /**
   * Продлевает текущую подписку пользователя
   * @param telegramId ID пользователя в Telegram
   * @param planId ID тарифа для продления
   * @returns Сообщение о результате операции
   */
  async extendSubscription(telegramId: string, planId: string): Promise<string> {
    try {
      // Получаем пользователя из Convex
      const user = await convexClient.getUserByTelegramId(telegramId) as ConvexUser;
      if (!user) {
        return "Пользователь не найден";
      }
      
      // Получаем VPN-аккаунт пользователя
      const vpnAccount = await convexClient.getUserVpnAccount(user._id) as ConvexVpnAccount;
      if (!vpnAccount) {
        return "У вас нет VPN-аккаунта.";
      }
      
      // Получаем подписку пользователя
      const subscription = await convexClient.getSubscription(user._id) as ConvexSubscription;
      if (!subscription) {
        return "У вас нет активной подписки.";
      }
      
      // Получаем план подписки
      const plan = await convexClient.query(api.subscriptionPlans.getPlanById, {
        planId: planId,
      });
      
      if (!plan) {
        return "Выбранный тариф недоступен. Пожалуйста, выберите другой тариф.";
      }
      
      // Продлеваем подписку
      await convexClient.extendSubscription(subscription._id, planId as Id<"subscriptionPlans">);
      
      // Активируем и обновляем VPN-аккаунт
      const reactivateResult = await convexClient.reactivateVpnAccount(
        vpnAccount._id,
        subscription.expiresAt,
        plan.trafficGB * 1024 * 1024 * 1024 // Конвертируем ГБ в байты
      );
      
      if (!reactivateResult) {
        return "Не удалось активировать VPN-аккаунт. Пожалуйста, обратитесь в поддержку.";
      }
      
      return `✅ Подписка успешно продлена!

🔹 *Тариф*: ${plan.name}
🔹 *Период*: ${plan.durationDays} дней
🔹 *Трафик*: ${plan.trafficGB} ГБ

Для просмотра статистики используйте кнопку "📊 Моя подписка"
Для получения данных подключения используйте кнопку "🔑 Данные для подключения"`;
    } catch (error) {
      logger.error("Ошибка продления подписки", error);
      return "Произошла ошибка при продлении подписки. Пожалуйста, обратитесь в поддержку.";
    }
  }
  
  /**
   * Меняет тариф подписки пользователя
   * @param telegramId ID пользователя в Telegram
   * @param newPlanId ID нового тарифа
   * @returns Сообщение о результате операции
   */
  async changeSubscriptionPlan(telegramId: string, newPlanId: string): Promise<string> {
    try {
      // Получаем пользователя из Convex
      const user = await convexClient.getUserByTelegramId(telegramId) as ConvexUser;
      if (!user) {
        return "Пользователь не найден";
      }
      
      // Получаем VPN-аккаунт пользователя
      const vpnAccount = await convexClient.getUserVpnAccount(user._id) as ConvexVpnAccount;
      if (!vpnAccount) {
        return "У вас нет VPN-аккаунта.";
      }
      
      // Получаем подписку пользователя
      const subscription = await convexClient.getSubscription(user._id) as ConvexSubscription;
      if (!subscription) {
        return "У вас нет активной подписки.";
      }
      
      // Получаем новый план подписки
      const newPlan = await convexClient.query(api.subscriptionPlans.getPlanById, {
        planId: newPlanId,
      });
      
      if (!newPlan) {
        return "Выбранный тариф недоступен. Пожалуйста, выберите другой тариф.";
      }
      
      // Обновляем подписку на новый тариф
      await convexClient.changePlan(subscription._id, newPlanId as Id<"subscriptionPlans">);
      
      // Активируем и обновляем VPN-аккаунт
      const reactivateResult = await convexClient.reactivateVpnAccount(
        vpnAccount._id,
        subscription.expiresAt,
        newPlan.trafficGB * 1024 * 1024 * 1024 // Конвертируем ГБ в байты
      );
      
      if (!reactivateResult) {
        return "Не удалось активировать VPN-аккаунт с новым тарифом. Пожалуйста, обратитесь в поддержку.";
      }
      
      return `✅ Тариф успешно изменен!

🔹 *Новый тариф*: ${newPlan.name}
🔹 *Период*: ${newPlan.durationDays} дней
🔹 *Трафик*: ${newPlan.trafficGB} ГБ

Для просмотра статистики используйте кнопку "📊 Моя подписка"
Для получения данных подключения используйте кнопку "🔑 Данные для подключения"`;
    } catch (error) {
      logger.error("Ошибка смены тарифа", error);
      return "Произошла ошибка при смене тарифа. Пожалуйста, обратитесь в поддержку.";
    }
  }
}

export const vpnService = new VpnService();

export default vpnService; 