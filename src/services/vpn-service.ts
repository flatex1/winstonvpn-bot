import { XuiClient } from "../api/xui-client";
import { createLogger } from "../utils/logger";
import config from "../utils/config";
import convexClient from "./convex-client";
import { Id } from "../../convex/_generated/dataModel";

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

      // Получаем VPN-аккаунт пользователя
      const vpnAccount = await convexClient.getUserVpnAccount(user._id) as ConvexVpnAccount;
      if (!vpnAccount) {
        return "У вас нет активного VPN-аккаунта";
      }

      // Обновляем статистику использования трафика
      try {
        await convexClient.updateTrafficUsage(vpnAccount.email);
      } catch (error) {
        logger.error("Ошибка обновления статистики трафика", error);
      }

      // Получаем обновленные данные аккаунта
      const updatedAccount = await convexClient.getUserVpnAccount(user._id) as ConvexVpnAccount;
      if (!updatedAccount) {
        return "Не удалось получить данные VPN-аккаунта";
      }

      // Получаем данные подписки
      const subscription = await convexClient.getActiveSubscription(user._id) as ConvexSubscription;
      if (!subscription) {
        return "У вас нет активной подписки";
      }

      // Формируем ответ с информацией о VPN-аккаунте
      const trafficUsed = VpnService.formatTraffic(updatedAccount.trafficUsed);
      const trafficLimit = VpnService.formatTraffic(updatedAccount.trafficLimit);
      const trafficPercentage = Math.round((updatedAccount.trafficUsed / updatedAccount.trafficLimit) * 100);
      const expiryDate = VpnService.formatExpiryDate(updatedAccount.expiresAt);
      
      const statusMap: Record<string, string> = {
        active: "Активен",
        expired: "Истек",
        blocked: "Заблокирован"
      };

      return `📊 *Информация о VPN-подписке*

🔹 *Тариф*: ${subscription.plan.name}
🔹 *Статус*: ${statusMap[updatedAccount.status] || updatedAccount.status}
🔹 *Действует до*: ${expiryDate}
🔹 *Трафик*: ${trafficUsed} из ${trafficLimit} (${trafficPercentage}%)

Для просмотра данных для подключения используйте команду /connection`;
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

Воспользуйтесь приложением V2rayNG для Android или Happ для iOS.

📲 *Инструкция*:
1. Установите приложение
2. Нажмите на кнопку "+" или "Добавить"
3. Выберите "Сканировать QR-код" или "Импортировать из буфера обмена"
4. Вставьте или отсканируйте конфигурацию

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

Для просмотра статистики используйте команду /subscription
Для получения данных подключения используйте команду /connection`;
    } catch (error) {
      logger.error("Ошибка создания VPN-аккаунта", error);
      return "Произошла ошибка при создании VPN-аккаунта. Пожалуйста, обратитесь в поддержку.";
    }
  }
}

export const vpnService = new VpnService();

export default vpnService; 