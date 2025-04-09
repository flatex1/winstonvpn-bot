import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { 
  ApiResponse, 
  Inbound, 
  Client, 
  CreateClientRequest, 
  UpdateClientRequest,
  TrafficStats,
  ServerInfo,
  ConfigLinkResponse,
  ClientStat,
  XuiUser
} from './models';
import { createLogger } from '../utils/logger';

const logger = createLogger("xui-client");

/**
 * Клиент для работы с API 3x-ui
 */
export class XuiClient {
  private readonly apiUrl: string;
  private readonly username: string;
  private readonly password: string;
  private token: string | null = null;
  private axios: AxiosInstance;

  /**
   * Создает экземпляр клиента 3x-ui API
   * @param baseUrl Базовый URL сервера (например, https://example.com:2053)
   * @param username Имя пользователя для входа в панель
   * @param password Пароль для входа в панель
   */
  constructor(
    apiUrl: string,
    username: string,
    password: string
  ) {
    this.apiUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
    this.username = username;
    this.password = password;
    
    this.axios = axios.create({
      baseURL: this.apiUrl,
      timeout: 10000,
    });
    
    // Добавляем перехватчик запросов для логирования
    this.axios.interceptors.request.use((config) => {
      logger.apiRequest(config.method?.toUpperCase() || "UNKNOWN", config.url || "unknown", config.data);
      return config;
    });
    
    // Добавляем перехватчик ответов для логирования
    this.axios.interceptors.response.use(
      (response) => {
        logger.apiResponse(
          response.config.method?.toUpperCase() || "UNKNOWN",
          response.config.url || "unknown",
          response.status,
          response.data
        );
        return response;
      },
      (error) => {
        logger.error("API Error", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          method: error.config?.method,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Авторизация в системе 3x-ui
   */
  private async login(): Promise<void> {
    try {
      const response = await this.axios.post<ApiResponse<{ token: string }>>(
        "/login",
        {
          username: this.username,
          password: this.password,
        }
      );
      
      if (response.data.success && response.data.obj?.token) {
        this.token = response.data.obj.token;
        logger.info("Успешная авторизация в 3x-ui API");
      } else {
        throw new Error(response.data.message || "Ошибка авторизации");
      }
    } catch (error) {
      logger.error("Ошибка авторизации в 3x-ui API", error);
      throw new Error("Ошибка авторизации в 3x-ui API");
    }
  }

  /**
   * Получение заголовков с токеном авторизации
   */
  private async getHeaders(): Promise<AxiosRequestConfig> {
    if (!this.token) {
      await this.login();
    }
    
    return {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };
  }

  /**
   * Выполнение запроса с повторной авторизацией при необходимости
   */
  private async request<T>(
    method: "get" | "post" | "put" | "delete",
    url: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders();
      
      let response;
      if (method === "get") {
        response = await this.axios.get<ApiResponse<T>>(url, headers);
      } else if (method === "post") {
        response = await this.axios.post<ApiResponse<T>>(url, data, headers);
      } else if (method === "put") {
        response = await this.axios.put<ApiResponse<T>>(url, data, headers);
      } else if (method === "delete") {
        response = await this.axios.delete<ApiResponse<T>>(url, headers);
      } else {
        throw new Error("Неподдерживаемый метод HTTP");
      }
      
      return response.data;
    } catch (error: any) {
      // Если ошибка связана с авторизацией, пробуем повторно авторизоваться
      if (error.response?.status === 401) {
        this.token = null;
        const headers = await this.getHeaders();
        
        // Повторяем запрос с новым токеном
        let response;
        if (method === "get") {
          response = await this.axios.get<ApiResponse<T>>(url, headers);
        } else if (method === "post") {
          response = await this.axios.post<ApiResponse<T>>(url, data, headers);
        } else if (method === "put") {
          response = await this.axios.put<ApiResponse<T>>(url, data, headers);
        } else if (method === "delete") {
          response = await this.axios.delete<ApiResponse<T>>(url, headers);
        } else {
          throw new Error("Неподдерживаемый метод HTTP");
        }
        
        return response.data;
      }
      
      throw error;
    }
  }

  /**
   * Получение списка inbounds
   */
  async getInbounds(): Promise<Inbound[]> {
    const response = await this.request<Inbound[]>("get", "/panel/api/inbounds");
    
    if (!response.success || !response.obj) {
      throw new Error(response.message || "Не удалось получить список inbounds");
    }
    
    return response.obj;
  }

  /**
   * Получение информации об inbound по ID
   */
  async getInbound(id: number): Promise<Inbound> {
    const response = await this.request<Inbound>("get", `/panel/api/inbound/${id}`);
    
    if (!response.success || !response.obj) {
      throw new Error(response.message || "Не удалось получить информацию об inbound");
    }
    
    return response.obj;
  }

  /**
   * Добавление клиента в inbound
   */
  async addClient(inboundId: number, client: CreateClientRequest): Promise<Client> {
    const response = await this.request<Client>(
      "post",
      `/panel/api/inbound/addClient/${inboundId}`,
      client
    );
    
    if (!response.success) {
      throw new Error(response.message || "Не удалось добавить клиента");
    }
    
    // Получаем обновленный inbound, чтобы найти добавленного клиента
    const inbound = await this.getInbound(inboundId);
    const settings = JSON.parse(inbound.settings);
    const newClient = settings.clients.find((c: Client) => c.email === client.email);
    
    if (!newClient) {
      throw new Error("Клиент добавлен, но не найден в списке");
    }
    
    return newClient;
  }

  /**
   * Получение статистики клиента
   */
  async getClientStats(inboundId: number, email: string): Promise<ClientStat | null> {
    const inbound = await this.getInbound(inboundId);
    
    if (!inbound.clientStats) {
      return null;
    }
    
    const clientStat = inbound.clientStats.find(stat => stat.email === email);
    return clientStat || null;
  }

  /**
   * Удаление клиента из inbound
   */
  async deleteClient(inboundId: number, clientId: string): Promise<boolean> {
    const response = await this.request<void>(
      "post",
      `/panel/api/inbound/delClient/${inboundId}/${clientId}`
    );
    
    return response.success;
  }

  /**
   * Обновление данных клиента
   */
  async updateClient(inboundId: number, client: UpdateClientRequest): Promise<boolean> {
    // Форматируем данные согласно требованиям API
    const data = {
      id: inboundId,
      settings: JSON.stringify({
        clients: [client]
      })
    };
    
    const response = await this.request<void>(
      "post",
      `/panel/api/inbounds/updateClient`,
      data
    );
    
    return response.success;
  }

  /**
   * Получение ссылки для настройки клиента
   */
  async getClientConfigLinks(inboundId: number, clientId: string): Promise<ConfigLinkResponse> {
    // Получаем информацию об inbound
    const inbound = await this.getInbound(inboundId);
    
    // Парсим настройки inbound и находим клиента
    const settings = JSON.parse(inbound.settings);
    const client = settings.clients.find((c: Client) => c.id === clientId);
    
    if (!client) {
      throw new Error("Клиент не найден");
    }
    
    // Получаем базовый URL сервера из API URL
    const url = new URL(this.apiUrl);
    const serverAddress = url.hostname;
    
    // Формируем ответ с разными типами конфигураций
    const response: ConfigLinkResponse = {};
    
    // Парсим настройки потоков
    const streamSettings = JSON.parse(inbound.streamSettings);
    const network = streamSettings.network || 'tcp';
    const security = streamSettings.security || 'none';
    
    // VMess конфигурация
    if (inbound.protocol === 'vmess') {
      const vmessConfig = {
        v: '2',
        ps: client.email,
        add: serverAddress,
        port: inbound.port,
        id: client.id,
        aid: client.alterId || 0,
        net: network,
        type: streamSettings.tcpSettings?.header?.type || 'none',
        host: streamSettings.wsSettings?.headers?.Host || '',
        path: streamSettings.wsSettings?.path || streamSettings.tcpSettings?.header?.request?.path || '',
        tls: security === 'tls' ? 'tls' : '',
        sni: streamSettings.tlsSettings?.serverName || '',
      };
      
      response.vmessLink = `vmess://${Buffer.from(JSON.stringify(vmessConfig)).toString('base64')}`;
    }
    
    // VLESS конфигурация
    if (inbound.protocol === 'vless') {
      const flow = client.flow || '';
      const params = new URLSearchParams();
      params.append('type', network);
      params.append('encryption', 'none');
      
      if (security === 'tls') {
        params.append('security', 'tls');
        if (streamSettings.tlsSettings?.serverName) {
          params.append('sni', streamSettings.tlsSettings.serverName);
        }
      }
      
      if (network === 'ws') {
        if (streamSettings.wsSettings?.path) {
          params.append('path', streamSettings.wsSettings.path);
        }
        if (streamSettings.wsSettings?.headers?.Host) {
          params.append('host', streamSettings.wsSettings.headers.Host);
        }
      }
      
      response.vlessLink = `vless://${client.id}@${serverAddress}:${inbound.port}?${params.toString()}#${encodeURIComponent(client.email)}`;
    }
    
    // Trojan конфигурация
    if (inbound.protocol === 'trojan') {
      const params = new URLSearchParams();
      
      if (security === 'tls') {
        params.append('security', 'tls');
        if (streamSettings.tlsSettings?.serverName) {
          params.append('sni', streamSettings.tlsSettings.serverName);
        }
      }
      
      if (network === 'ws') {
        params.append('type', 'ws');
        if (streamSettings.wsSettings?.path) {
          params.append('path', streamSettings.wsSettings.path);
        }
        if (streamSettings.wsSettings?.headers?.Host) {
          params.append('host', streamSettings.wsSettings.headers.Host);
        }
      }
      
      response.trojanLink = `trojan://${client.id}@${serverAddress}:${inbound.port}?${params.toString()}#${encodeURIComponent(client.email)}`;
    }
    
    return response;
  }
}

// Экспортируем класс
export default XuiClient; 