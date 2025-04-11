"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Импортируем правильные типы для HTTP клиента
import axios, { AxiosError } from "axios";

// Типы для ответов функций
type VpnAccount = Doc<"vpnAccounts">;
type User = Doc<"users">;
type Subscription = {
  _id: Id<"userSubscriptions">;
  userId: Id<"users">;
  planId: Id<"subscriptionPlans">;
  status: string;
  expiresAt: number;
  plan: {
    name: string;
    trafficGB: number;
    durationDays: number;
  };
};

// Определяем типы для данных HTTP клиента
interface HttpResponse<T = any> {
  success: boolean;
  message?: string;
  headers?: Record<string, string[]>;
  obj?: T;
  data?: T;
}

// Вспомогательные функции для работы с 3x-ui API
/**
 * Авторизация в 3x-ui API и получение cookie сессии
 * @returns Строка cookie для авторизации или null в случае ошибки
 */
async function authorizeXuiApi(): Promise<string | null> {
  const XUI_API_URL = process.env.XUI_API_URL;
  const XUI_API_USERNAME = process.env.XUI_API_USERNAME;
  const XUI_API_PASSWORD = process.env.XUI_API_PASSWORD;
  
  if (!XUI_API_URL || !XUI_API_USERNAME || !XUI_API_PASSWORD) {
    console.log("Отсутствуют настройки для подключения к 3x-ui API");
    return null;
  }
  
  console.log("Запрос авторизации в 3x-ui API");
  try {
    const loginResponse = await axios.post(`${XUI_API_URL}/login`, {
      username: XUI_API_USERNAME,
      password: XUI_API_PASSWORD,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log("Статус авторизации:", loginResponse.status);
    
    // Получаем cookie из ответа
    const cookies = loginResponse.headers['set-cookie'] || [];
    const sessionCookie = cookies.length > 0 ? cookies[0].split(';')[0] : '';
    
    if (!sessionCookie) {
      console.log("Не найден cookie в ответе API");
      return null;
    }
    
    return sessionCookie;
  } catch (error) {
    console.error("Ошибка авторизации в 3x-ui API:", error);
    return null;
  }
}

/**
 * Обновление данных клиента в 3x-ui API
 * @param account VPN аккаунт
 * @param expiresAt Время истечения аккаунта
 * @param trafficLimit Лимит трафика
 * @returns true если обновление прошло успешно, иначе false
 */
export async function updateXuiClient(account: VpnAccount, expiresAt: number, trafficLimit: number): Promise<boolean> {
  const XUI_API_URL = process.env.XUI_API_URL;
  if (!XUI_API_URL) {
    console.log("Отсутствует URL для подключения к 3x-ui API");
    return false;
  }
  
  const sessionCookie = await authorizeXuiApi();
  if (!sessionCookie) {
    return false;
  }
  
  try {
    const clientSettings = {
      id: account.clientId,
      email: account.email,
      expiryTime: expiresAt,
      totalGB: trafficLimit,
      enable: true
    };
    
    const requestData = {
      id: account.inboundId,
      settings: JSON.stringify({
        clients: [clientSettings]
      })
    };
    
    const updateResponse = await axios.post(
      `${XUI_API_URL}/panel/api/inbounds/updateClient`,
      requestData,
      {
        headers: {
          Cookie: sessionCookie,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (!updateResponse.data || !updateResponse.data.success) {
      console.log("Ошибка обновления клиента:", updateResponse.data);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Ошибка при обновлении клиента в 3x-ui API:", error);
    return false;
  }
}

// Обновление или реактивация VPN-аккаунта
export const updateVpnAccount = action({
  args: {
    accountId: v.id("vpnAccounts"),
    expiresAt: v.number(),
    trafficLimit: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args): Promise<boolean> => {
    console.log("updateVpnAccount action вызвана с параметрами:", args);
    
    const account = await ctx.runQuery(api.vpnAccounts.getVpnAccountById, {
      accountId: args.accountId,
    }) as VpnAccount | null;
    
    if (!account) {
      throw new Error("VPN-аккаунт не найден");
    }
    
    // Обновляем клиента в 3x-ui API
    const updateResult = await updateXuiClient(account, args.expiresAt, args.trafficLimit);
    
    // Данные в базе уже обновлены через reactivateVpnAccount
    // Это действие вызывается только для обновления данных в 3x-ui API
    
    return updateResult;
  },
});

// Создание нового VPN-аккаунта через 3x-ui API
export const createVpnAccount = action({
  args: {
    userId: v.id("users"),
    userSubscriptionId: v.id("userSubscriptions"),
    inboundId: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<VpnAccount | null> => {
    console.log("createVpnAccount action called with args:", args);
    
    // Получаем пользователя и подписку
    const user = await ctx.runQuery(api.users.getUserById, { 
      userId: args.userId 
    }) as User;

    if (!user) {
      throw new Error("Пользователь не найден");
    }

    const subscription = await ctx.runQuery(api.userSubscriptions.getActiveSubscription, { 
      userId: args.userId 
    }) as Subscription;

    if (!subscription) {
      throw new Error("Активная подписка не найдена");
    }

    // Проверяем, есть ли у пользователя уже VPN-аккаунт
    const existingAccount = await ctx.runQuery(api.vpnAccounts.getUserVpnAccount, {
      userId: args.userId,
    }) as VpnAccount | null;

    if (existingAccount) {
      // Если есть активный аккаунт, продлеваем его
      if (existingAccount.status === "active") {
        return await ctx.runMutation(api.vpnAccounts.extendVpnAccount, {
          accountId: existingAccount._id,
          expiresAt: subscription.expiresAt,
          trafficLimit: subscription.plan.trafficGB * 1024 * 1024 * 1024, // в байтах
        }) as VpnAccount;
      } else {
        // Если аккаунт не активен, реактивируем его через API и в базе данных
        const trafficLimitBytes = subscription.plan.trafficGB * 1024 * 1024 * 1024;
        
        // Обновляем клиента в 3x-ui API
        await updateXuiClient(existingAccount, subscription.expiresAt, trafficLimitBytes);
        
        // Обновляем данные в базе
        await ctx.runMutation(api.vpnAccounts.reactivateVpnAccount, {
          accountId: existingAccount._id,
          expiresAt: subscription.expiresAt,
          trafficLimit: trafficLimitBytes,
        });
        
        // Получаем обновленные данные аккаунта
        return await ctx.runQuery(api.vpnAccounts.getVpnAccountById, {
          accountId: existingAccount._id
        }) as VpnAccount;
      }
    }

    // Создаем новый аккаунт
    const XUI_API_URL = process.env.XUI_API_URL;
    const XUI_API_USERNAME = process.env.XUI_API_USERNAME;
    const XUI_API_PASSWORD = process.env.XUI_API_PASSWORD;

    if (!XUI_API_URL || !XUI_API_USERNAME || !XUI_API_PASSWORD) {
      throw new Error("Отсутствуют настройки для подключения к 3x-ui API");
    }

    // Формируем email для 3x-ui клиента
    const email = `tg_${user.telegramId}_${Date.now()}`;

    try {
      const sessionCookie = await authorizeXuiApi();
      if (!sessionCookie) {
        throw new Error("Не удалось авторизоваться в 3x-ui API");
      }
      
      console.log("Запрос списка inbounds");
      const inboundsResponse = await axios.get(`${XUI_API_URL}/panel/api/inbounds/list`, {
        headers: {
          Cookie: sessionCookie,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log("Статус ответа списка inbounds:", inboundsResponse.status);
      const inboundsData = inboundsResponse.data;

      if (!inboundsData || !inboundsData.success) {
        console.log("Ошибка получения списка inbounds:", inboundsData);
        throw new Error("Не удалось получить список inbounds");
      }
      
      // Находим нужный inbound по ID
      let targetInbound = null;
      let protocol = "vless"; // Значение по умолчанию
      let port = 443; // Порт по умолчанию
      
      if (inboundsData.obj && Array.isArray(inboundsData.obj)) {
        targetInbound = inboundsData.obj.find((inbound: any) => inbound.id === args.inboundId);
        
        if (targetInbound) {
          console.log(`Найден inbound с ID=${args.inboundId}`);
          protocol = targetInbound.protocol || protocol;
          port = targetInbound.port || port;
          console.log(`Протокол inbound: ${protocol}, порт: ${port}`);
        } else {
          console.log(`Inbound с ID=${args.inboundId} не найден в списке`);
        }
      }
      
      // Если inbound не найден, выбрасываем ошибку
      if (!targetInbound) {
        throw new Error(`Inbound с ID=${args.inboundId} не найден`);
      }
      
      // Определяем тип сети из настроек inbound
      let networkType = "tcp"; // Тип сети по умолчанию
      
      try {
        if (targetInbound.streamSettings) {
          const streamSettings = typeof targetInbound.streamSettings === 'string' 
              ? JSON.parse(targetInbound.streamSettings) 
              : targetInbound.streamSettings;
          
          if (streamSettings.network) {
            networkType = streamSettings.network;
            console.log("Тип сети из inbound:", networkType);
          }
        }
      } catch (error) {
        console.log("Ошибка при получении типа сети из inbound:", error);
      }
      
      // Создаем клиента
      // Сначала генерируем UUID для клиента
      const crypto = require('crypto');
      const clientId = crypto.randomUUID();
      console.log("Сгенерирован UUID для клиента:", clientId);
      
      // Получаем параметры Reality из настроек inbound, если они есть
      let realitySettings: any = null;
      let publicKey = "";
      let fingerprint = "chrome";
      let serverName = "yahoo.com";
      let shortId = "";
      let spiderX = "/";
      
      try {
        if (targetInbound.streamSettings) {
          const streamSettings = typeof targetInbound.streamSettings === 'string' 
            ? JSON.parse(targetInbound.streamSettings) 
            : targetInbound.streamSettings;
            
          if (streamSettings.security === "reality" && streamSettings.realitySettings) {
            realitySettings = streamSettings.realitySettings;
            
            // Получаем параметры Reality
            if (realitySettings.settings && realitySettings.settings.publicKey) {
              publicKey = realitySettings.settings.publicKey;
            }
            
            if (realitySettings.settings && realitySettings.settings.fingerprint) {
              fingerprint = realitySettings.settings.fingerprint;
            }
            
            if (realitySettings.serverNames && realitySettings.serverNames.length > 0) {
              serverName = realitySettings.serverNames[0];
            }
            
            if (realitySettings.shortIds && realitySettings.shortIds.length > 0) {
              shortId = realitySettings.shortIds[0];
            }
            
            if (realitySettings.settings && realitySettings.settings.spiderX) {
              spiderX = realitySettings.settings.spiderX;
            }
            
            console.log("Получены настройки Reality:", {
              publicKey,
              fingerprint,
              serverName,
              shortId,
              spiderX
            });
          }
        }
      } catch (error) {
        console.log("Ошибка при получении настроек Reality:", error);
      }
      
      // Преобразуем ГБ в байты
      const trafficLimitBytes = subscription.plan.trafficGB * 1024 * 1024 * 1024;
      console.log(`Установка лимита трафика: ${subscription.plan.trafficGB} ГБ (${trafficLimitBytes} байт)`);
      
      const clientSettings = {
        clients: [{
          id: clientId,
          flow: "xtls-rprx-vision",
          email: email,
          limitIp: 0,
          totalGB: trafficLimitBytes,
          expiryTime: subscription.expiresAt,
          enable: true,
          tgId: user.telegramId.toString(),
          subId: subscription._id.toString(),
          reset: 0
        }]
      };
      
      // Формируем запрос в формате, который ожидает API
      const requestData = {
        id: args.inboundId,
        settings: JSON.stringify(clientSettings)
      };
      
      console.log("Отправка запроса на создание клиента:", JSON.stringify(requestData, null, 2));
      
      const createClientResponse = await axios.post(
        `${XUI_API_URL}/panel/api/inbounds/addClient`,
        requestData,
        {
          headers: {
            Cookie: sessionCookie,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log("Статус создания клиента:", createClientResponse.status);
      console.log("Ответ API:", JSON.stringify(createClientResponse.data, null, 2));
      
      // Проверяем успешность запроса
      if (!createClientResponse.data || !createClientResponse.data.success) {
        console.log("Ошибка создания клиента:", createClientResponse.data);
        throw new Error("Не удалось создать клиента");
      }
      
      console.log("Клиент успешно создан, ожидаем обработки...");
      
      // Ждем обработки создания клиента
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Получаем обновленные данные inbound для получения ID клиента
      console.log("Запрос обновленных данных inbound");
      const updatedInboundResponse = await axios.get(
        `${XUI_API_URL}/panel/api/inbounds/get/${args.inboundId}`,
        {
          headers: {
            Cookie: sessionCookie,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log("Статус получения inbound:", updatedInboundResponse.status);
      
      // Проверяем успешность создания клиента
      let inboundData = updatedInboundResponse.data;
      
      if (inboundData && inboundData.success && inboundData.obj) {
        const inbound = inboundData.obj;
        
        try {
          if (inbound.settings) {
            const settings = typeof inbound.settings === 'string' 
                ? JSON.parse(inbound.settings) 
                : inbound.settings;
            
            if (settings.clients && Array.isArray(settings.clients)) {
              // Проверяем, что клиент действительно создался
              const client = settings.clients.find((c: any) => c.email === email);
              if (client) {
                console.log("Клиент успешно создан и найден в inbound");
              } else {
                console.log("Предупреждение: Клиент создан, но не найден в списке клиентов inbound");
              }
            }
          }
        } catch (error) {
          console.log("Ошибка при проверке создания клиента:", error);
        }
      }
      
      // Получаем адрес сервера
      let serverAddress = "";
      try {
        const url = new URL(XUI_API_URL);
        serverAddress = url.hostname;
      } catch (error) {
        console.log("Ошибка при получении адреса сервера из URL:", error);
        serverAddress = "localhost"; // Значение по умолчанию
      }
      
      // Формируем ссылку подключения
      let connectionDetails = "";
      
      try {
        if (protocol === 'vmess') {
          "use node"; // Необходимо для использования Buffer
          const vmessConfig = {
            v: '2',
            ps: email,
            add: serverAddress,
            port: port,
            id: clientId,
            aid: 0,
            net: networkType,
            type: 'none',
            host: '',
            path: '',
            tls: '',
            sni: '',
          };
          
          connectionDetails = `vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`;
        } else if (protocol === 'vless') {
          const params = new URLSearchParams();
          params.append('type', networkType);
          params.append('encryption', 'none');
          
          // Добавляем параметры Reality, если они существуют
          if (realitySettings) {
            params.append('security', 'reality');
            params.append('pbk', publicKey);
            params.append('fp', fingerprint);
            params.append('sni', serverName);
            params.append('sid', shortId);
            params.append('spx', spiderX);
            params.append('flow', 'xtls-rprx-vision');
          }
          
          connectionDetails = `vless://${clientId}@${serverAddress}:${port}?${params.toString()}#${encodeURIComponent(email)}`;
        } else if (protocol === 'trojan') {
          const params = new URLSearchParams();
          params.append('type', networkType);
          
          connectionDetails = `trojan://${clientId}@${serverAddress}:${port}?${params.toString()}#${encodeURIComponent(email)}`;
        }
        
        console.log("Сформирована ссылка подключения:", connectionDetails);
      } catch (error) {
        console.log("Ошибка при формировании ссылки:", error);
        connectionDetails = "Ошибка генерации ссылки";
      }
      
      // Сохраняем VPN-аккаунт в базе
      const accountId = await ctx.runMutation(api.vpnAccounts.saveVpnAccount, {
        userId: args.userId,
        inboundId: args.inboundId,
        clientId: clientId,
        email,
        expiresAt: subscription.expiresAt,
        trafficLimit: trafficLimitBytes,
        trafficUsed: 0,
        status: "active",
        connectionDetails,
      }) as Id<"vpnAccounts">;
      
      // Возвращаем данные аккаунта
      return await ctx.runQuery(api.vpnAccounts.getVpnAccountById, {
        accountId,
      }) as VpnAccount;
    } catch (error) {
      console.error("Ошибка при создании VPN-аккаунта:", error);
      if (error instanceof Error) {
        throw new Error(`Ошибка при создании VPN-аккаунта: ${error.message}`);
      } else {
        throw new Error("Неизвестная ошибка при создании VPN-аккаунта");
      }
    }
  },
});

// Обновление статистики использования трафика
export const updateTrafficUsage = action({
  args: {
    email: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<VpnAccount | null> => {
    const account = await ctx.runQuery(api.vpnAccounts.getVpnAccountByEmail, {
      email: args.email,
    }) as VpnAccount | null;
    
    if (!account) {
      throw new Error("VPN-аккаунт не найден");
    }
    
    // Запрашиваем статистику из 3x-ui API
    const XUI_API_URL = process.env.XUI_API_URL;
    const XUI_API_USERNAME = process.env.XUI_API_USERNAME;
    const XUI_API_PASSWORD = process.env.XUI_API_PASSWORD;
    
    if (!XUI_API_URL || !XUI_API_USERNAME || !XUI_API_PASSWORD) {
      throw new Error("Отсутствуют настройки для подключения к 3x-ui API");
    }
    
    try {
      // Сначала авторизуемся для получения cookie
      console.log("Запрос авторизации в 3x-ui API");
      const loginResponse = await axios.post(`${XUI_API_URL}/login`, {
        username: XUI_API_USERNAME,
        password: XUI_API_PASSWORD,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log("Статус авторизации:", loginResponse.status);
      
      // Получаем cookie из ответа
      const cookies = loginResponse.headers['set-cookie'] || [];
      const sessionCookie = cookies.length > 0 ? cookies[0].split(';')[0] : '';
      
      if (!sessionCookie) {
        console.log("Не найден cookie в ответе API");
        throw new Error("Не удалось получить cookie для авторизации в 3x-ui API");
      }
      
      console.log("Получен cookie:", sessionCookie);
      
      // Получаем информацию о inbound
      console.log(`Получаем информацию об inbound ${account.inboundId}`);
      const inboundResponse = await axios.get(
        `${XUI_API_URL}/panel/api/inbounds/get/${account.inboundId}`,
        {
          headers: {
            Cookie: sessionCookie,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log("Статус получения inbound:", inboundResponse.status);
      
      // Проверяем успешность запроса
      if (!inboundResponse.data || !inboundResponse.data.success) {
        console.log("Ошибка получения информации об inbound:", inboundResponse.data);
        throw new Error("Не удалось получить информацию об inbound");
      }

      // Переменные для хранения данных о трафике
      let trafficUsed = 0;
      let foundClientStat = false;

      // Детальный вывод данных для отладки
      if (inboundResponse.data.obj) {
        console.log("Получен inbound:", JSON.stringify({
          id: inboundResponse.data.obj.id,
          protocol: inboundResponse.data.obj.protocol,
          port: inboundResponse.data.obj.port,
          hasClientStats: !!inboundResponse.data.obj.clientStats,
          clientStatsCount: inboundResponse.data.obj.clientStats ? inboundResponse.data.obj.clientStats.length : 0
        }, null, 2));
      }
      
      // Пробуем получить статистику напрямую через специальный API endpoint
      console.log(`Получение статистики клиента через отдельный API endpoint для ${account.email}`);
      try {
        const statsResponse = await axios.get(
          `${XUI_API_URL}/panel/api/inbounds/getClientTraffics/${account.email}`,
          {
            headers: {
              Cookie: sessionCookie,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );
        
        console.log("Статус получения статистики клиента:", statsResponse.status);
        console.log("Данные статистики:", JSON.stringify(statsResponse.data, null, 2));
        
        if (statsResponse.data && statsResponse.data.success && statsResponse.data.obj) {
          // Пробуем извлечь данные из прямого ответа API статистики
          const stats = statsResponse.data.obj;
          if (stats.up !== undefined && stats.down !== undefined) {
            const up = Number(stats.up) || 0;
            const down = Number(stats.down) || 0;
            trafficUsed = up + down;
            foundClientStat = true;
            console.log(`Найдена статистика через API: upload=${up}, download=${down}, total=${trafficUsed}`);
          }
        }
      } catch (error) {
        console.log("Ошибка при получении статистики через отдельный API endpoint:", error instanceof Error ? error.message : String(error));
        
        // Пробуем получить статистику по UUID
        console.log(`Попытка получения статистики по UUID клиента: ${account.clientId}`);
        try {
          const statsResponseById = await axios.get(
            `${XUI_API_URL}/panel/api/inbounds/getClientTrafficsById/${account.clientId}`,
            {
              headers: {
                Cookie: sessionCookie,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }
          );
          
          console.log("Статус получения статистики клиента по UUID:", statsResponseById.status);
          console.log("Данные статистики по UUID:", JSON.stringify(statsResponseById.data, null, 2));
          
          if (statsResponseById.data && statsResponseById.data.success && statsResponseById.data.obj) {
            // Пробуем извлечь данные из ответа API статистики
            const stats = statsResponseById.data.obj;
            if (stats.up !== undefined && stats.down !== undefined) {
              const up = Number(stats.up) || 0;
              const down = Number(stats.down) || 0;
              trafficUsed = up + down;
              foundClientStat = true;
              console.log(`Найдена статистика через API по UUID: upload=${up}, download=${down}, total=${trafficUsed}`);
            }
          }
        } catch (uuidError) {
          console.log("Ошибка при получении статистики по UUID:", uuidError instanceof Error ? uuidError.message : String(uuidError));
        }
      }
      
      // Если не удалось получить статистику через API, пробуем получить из объекта inbound
      if (!foundClientStat && inboundResponse.data.obj) {
        try {
          const inbound = inboundResponse.data.obj;
          
          // Проверяем наличие clientStats в объекте inbound
          if (inbound.clientStats && Array.isArray(inbound.clientStats)) {
            console.log(`Найдено ${inbound.clientStats.length} записей статистики клиентов`);
            
            // Выведем все email
            const clientEmails = inbound.clientStats.map((stat: any) => stat.email);
            console.log("Доступные email в статистике:", clientEmails);
            
            // Ищем статистику по email клиента
            const clientStat = inbound.clientStats.find(
              (stat: any) => stat.email === account.email
            );
            
            if (clientStat) {
              foundClientStat = true;
              const up = Number(clientStat.up) || 0;
              const down = Number(clientStat.down) || 0;
              trafficUsed = up + down;
              console.log(`Найдена статистика для клиента ${account.email}: upload=${up}, download=${down}, total=${trafficUsed}`);
            }
          } else {
            console.log("В объекте inbound отсутствует clientStats или это не массив");
          }
        } catch (error) {
          console.log("Ошибка при разборе данных статистики из inbound:", error instanceof Error ? error.message : String(error));
        }
      }
      
      // Если не удалось получить статистику ни одним из способов, используем текущее значение
      if (!foundClientStat) {
        console.log(`Не удалось найти статистику клиента ${args.email}, используем текущее значение`);
        trafficUsed = account.trafficUsed;
        
      }
      
      await ctx.runMutation(api.vpnAccounts.updateAccountTraffic, {
        accountId: account._id,
        trafficUsed: trafficUsed,
      });
      
      const updatedAccount = await ctx.runQuery(api.vpnAccounts.getVpnAccountById, {
        accountId: account._id,
      }) as VpnAccount | null;
      
      
      return updatedAccount;
    } catch (error) {
      console.error("Ошибка при обновлении статистики:", error);
      if (error instanceof Error) {
        throw new Error(`Ошибка при обновлении статистики: ${error.message}`);
      } else {
        throw new Error("Неизвестная ошибка при обновлении статистики");
      }
    }
  },
});

/**
* Удаление VPN-аккаунта (и в 3x-ui тоже)
*/
export const deleteVpnAccount = action({
  args: {
    accountId: v.id("vpnAccounts"),
  },
  returns: v.boolean(),
  handler: async (ctx, args): Promise<boolean> => {
    const account = await ctx.runQuery(api.vpnAccounts.getVpnAccountById, {
      accountId: args.accountId,
    }) as VpnAccount | null;
    
    if (!account) {
      throw new Error("VPN-аккаунт не найден");
    }
    
    // Удаляем аккаунт в 3x-ui
    const XUI_API_URL = process.env.XUI_API_URL;
    const XUI_API_USERNAME = process.env.XUI_API_USERNAME;
    const XUI_API_PASSWORD = process.env.XUI_API_PASSWORD;
    
    if (!XUI_API_URL || !XUI_API_USERNAME || !XUI_API_PASSWORD) {
      throw new Error("Отсутствуют настройки для подключения к 3x-ui API");
    }
    
    try {
      // Сначала авторизуемся для получения cookie
      console.log("Запрос авторизации в 3x-ui API");
      const loginResponse = await axios.post(`${XUI_API_URL}/login`, {
        username: XUI_API_USERNAME,
        password: XUI_API_PASSWORD,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log("Статус авторизации:", loginResponse.status);
      
      // Получаем cookie из ответа
      const cookies = loginResponse.headers['set-cookie'] || [];
      const sessionCookie = cookies.length > 0 ? cookies[0].split(';')[0] : '';
      
      if (!sessionCookie) {
        console.log("Не найден cookie в ответе API");
        throw new Error("Не удалось получить cookie для авторизации в 3x-ui API");
      }
      
      console.log("Получен cookie:", sessionCookie);
      
      // Пробуем удалить клиента через API
      console.log(`Отправляем запрос на удаление клиента с inboundId=${account.inboundId}, clientId=${account.clientId}`);
      
      const deleteResponse = await axios.post(
        `${XUI_API_URL}/panel/api/inbounds/delClient`,
        {
          id: account.inboundId,
          clientId: account.clientId
        },
        {
          headers: {
            Cookie: sessionCookie,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log("Статус удаления клиента:", deleteResponse.status);
      console.log("Ответ API:", JSON.stringify(deleteResponse.data, null, 2));
      
      // Даже если API вернул ошибку при удалении клиента, мы все равно удаляем запись из базы
      if (!deleteResponse.data || !deleteResponse.data.success) {
        console.log("Предупреждение: Ошибка при удалении клиента в 3x-ui API, но продолжаем удаление из базы");
      }
      
      // Удаляем аккаунт из нашей базы в любом случае
      await ctx.runMutation(api.vpnAccounts.removeVpnAccount, {
        accountId: args.accountId,
      });
      
      return true;
    } catch (error) {
      // Обрабатываем ошибки, и, возможно, все равно удаляем из базы
      console.error("Ошибка при удалении VPN-аккаунта:", error);
      
      try {
        // Даже при ошибке пытаемся удалить запись из базы
        console.log("Пытаемся удалить аккаунт из базы, несмотря на ошибку в API");
        await ctx.runMutation(api.vpnAccounts.removeVpnAccount, {
          accountId: args.accountId,
        });
        return true;
      } catch (dbError) {
        console.error("Ошибка при удалении записи из базы:", dbError);
        throw new Error("Не удалось удалить запись из базы");
      }
    }
  },
});