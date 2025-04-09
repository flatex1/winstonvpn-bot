// Модели данных для 3x-ui API

// Основная структура ответа API
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  obj?: T;
}

// Модель пользователя в 3x-ui
export interface XuiUser {
  id: number;
  username: string;
  password: string;
}

// Модель inbound сервера
export interface Inbound {
  id: number;
  userId: number;
  up: number;
  down: number;
  total: number;
  remark: string;
  enable: boolean;
  expiryTime: number;
  listen: string;
  port: number;
  protocol: string;
  settings: string;
  streamSettings: string;
  tag: string;
  sniffing: string;
  clientStats: ClientStat[];
  clients?: Client[];
}

// Модель клиента (пользователя VPN)
export interface Client {
  id: string; // UUID клиента
  alterId: number;
  email: string;
  limitIp: number;
  totalGB: number;
  expiryTime: number;
  enable: boolean;
  up: number;
  down: number;
  flow: string;
}

// Модель статистики клиента
export interface ClientStat {
  id: number;
  inboundId: number;
  enable: boolean;
  email: string;
  up: number;
  down: number;
  expiryTime: number;
  total: number;
}

// Модель статистики трафика
export interface TrafficStats {
  up: number;  // Исходящий трафик в байтах
  down: number; // Входящий трафик в байтах
  total: number; // Общий трафик в байтах
}

// Модель для создания нового клиента
export interface CreateClientRequest {
  id?: string; // UUID (необязательно, генерируется автоматически)
  alterId?: number; // Обычно 0 для VMESS/VLESS с XTLS
  email: string; // Идентификатор клиента, обычно email
  limitIp?: number; // Лимит IP-адресов (0 - неограничено)
  totalGB: number; // Лимит трафика в гигабайтах
  expiryTime: number; // Время истечения в Unix timestamp (миллисекунды)
  enable?: boolean; // Включен ли аккаунт (по умолчанию true)
  flow?: string; // Тип потока (для XTLS)
  tgId?: string; // Telegram ID (опционально)
  subId?: string; // ID подписки (опционально)
}

// Модель для обновления клиента
export interface UpdateClientRequest {
  id: string; // UUID клиента, обязательное поле
  alterId?: number;
  email?: string;
  limitIp?: number;
  totalGB?: number;
  expiryTime?: number;
  enable?: boolean;
  flow?: string;
  tgId?: string;
  subId?: string;
}

// Модель конфигурации v2ray/xray для клиента
export interface ClientConfig {
  server: string;
  serverPort: number;
  id: string;
  alterId?: number;
  security: string;
  network: string;
  host?: string;
  path?: string;
  type?: string;
  tls?: boolean;
  sni?: string;
}

// Модель для получения URL-конфигурации для клиента
export interface ConfigLinkResponse {
  vmessLink?: string;
  vlessLink?: string;
  trojanLink?: string;
  shadowsocksLink?: string;
}

// Модель для данных сервера
export interface ServerInfo {
  cpu: number; // Использование CPU (%)
  disk: {
    free: number; // Свободное место (байты)
    total: number; // Общее место (байты)
    used: number; // Использованное место (байты)
  };
  memory: {
    free: number; // Свободная память (байты)
    total: number; // Общая память (байты)
    used: number; // Использованная память (байты)
  };
  network: {
    rxTotal: number; // Полученный трафик (байты)
    txTotal: number; // Отправленный трафик (байты)
  };
  uptime: number; // Время работы сервера (секунды)
  xray: {
    state: boolean; // Состояние xray (запущен или нет)
    version: string; // Версия xray
  };
} 