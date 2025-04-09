import { isDev } from './config';

class Logger {
  private readonly namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  private format(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] [${this.namespace}] ${message}`;
    
    if (data) {
      try {
        const formattedData = typeof data === 'object' 
          ? JSON.stringify(data, null, isDev ? 2 : 0)
          : data.toString();
        
        formattedMessage += ` ${formattedData}`;
      } catch (error) {
        formattedMessage += ` [Невозможно преобразовать данные: ${error}]`;
      }
    }
    
    return formattedMessage;
  }

  // Уровни логирования
  debug(message: string, data?: any): void {
    if (isDev) {
      console.debug(this.format('DEBUG', message, data));
    }
  }

  info(message: string, data?: any): void {
    console.info(this.format('INFO', message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.format('WARN', message, data));
  }

  error(message: string, error?: any): void {
    if (error instanceof Error) {
      console.error(this.format('ERROR', message, {
        message: error.message,
        stack: error.stack
      }));
    } else {
      console.error(this.format('ERROR', message, error));
    }
  }

  // Логирование запросов к API
  apiRequest(method: string, url: string, data?: any): void {
    this.debug(`API Request: ${method} ${url}`, data);
  }

  // Логирование ответов от API
  apiResponse(method: string, url: string, status: number, data?: any): void {
    this.debug(`API Response: ${method} ${url} (${status})`, data);
  }

  // Логирование работы с Telegram
  telegramUpdate(update: any): void {
    let type = 'unknown';
    let id = 'unknown';

    if (update.message) {
      type = 'message';
      id = update.message.message_id;
    } else if (update.callback_query) {
      type = 'callback_query';
      id = update.callback_query.id;
    } else if (update.inline_query) {
      type = 'inline_query';
      id = update.inline_query.id;
    }

    this.debug(`Telegram Update [${type}:${id}]`, isDev ? update : undefined);
  }

  // Создать новый логгер с другим пространством имен
  child(namespace: string): Logger {
    return new Logger(`${this.namespace}:${namespace}`);
  }
}

// Создаем корневой логгер
export const rootLogger = new Logger('app');

// Функция для создания логгера с пространством имен
export function createLogger(namespace: string): Logger {
  return rootLogger.child(namespace);
}

// Экспортируем логгер по умолчанию
export default rootLogger; 