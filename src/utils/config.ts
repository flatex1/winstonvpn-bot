import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: '.env.local' });

if (!process.env.BOT_TOKEN) {
  console.log('Переменные из .env.local не загружены, пробую загрузить из .env');
  dotenv.config();
}

// Определяем схему конфигурации с валидацией
const configSchema = z.object({
  // Telegram
  BOT_TOKEN: z.string().min(1, 'Токен бота не может быть пустым'),
  ADMIN_TELEGRAM_IDS: z.string().transform((val: string) => 
    val.split(',').map((id: string) => id.trim())
  ),
  
  // Convex - параметры опциональны, так как они добавляются Convex автоматически
  CONVEX_DEPLOYMENT: z.string().optional(),
  CONVEX_URL: z.string().optional(),
  
  // 3x-ui
  XUI_API_URL: z.string().min(1, 'URL для 3x-ui API не может быть пустым'),
  XUI_API_USERNAME: z.string().min(1, 'Имя пользователя 3x-ui не может быть пустым'),
  XUI_API_PASSWORD: z.string().min(1, 'Пароль 3x-ui не может быть пустым'),
  XUI_DEFAULT_INBOUND_ID: z.string().transform((val: string) => parseInt(val, 10)),
  
  // Web-приложение (для webhook, опционально)
  PUBLIC_URL: z.string().optional(),
  
  // Режим работы
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Параметры для bot.use(session())
  SESSION_KEY: z.string().default('bot:session'),
});

const getConfig = () => {
  try {
    return configSchema.parse({
      BOT_TOKEN: process.env.BOT_TOKEN,
      ADMIN_TELEGRAM_IDS: process.env.ADMIN_TELEGRAM_IDS || '',
      CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
      CONVEX_URL: process.env.CONVEX_URL,
      XUI_API_URL: process.env.XUI_API_URL,
      XUI_API_USERNAME: process.env.XUI_API_USERNAME,
      XUI_API_PASSWORD: process.env.XUI_API_PASSWORD,
      XUI_DEFAULT_INBOUND_ID: process.env.XUI_DEFAULT_INBOUND_ID || '5',
      PUBLIC_URL: process.env.PUBLIC_URL,
      NODE_ENV: process.env.NODE_ENV,
      SESSION_KEY: process.env.SESSION_KEY,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Ошибка конфигурации:', error.errors);
      process.exit(1);
    }
    throw error;
  }
};

export const config = getConfig();

export const isDev = config.NODE_ENV === 'development';
export const isProd = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

export default config; 