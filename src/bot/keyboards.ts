import { InlineKeyboard, Keyboard } from "grammy";
import { Doc } from "../../convex/_generated/dataModel";

// Главное меню бота
export const mainKeyboard = new Keyboard()
  .text("📊 Моя подписка")
  .text("🔑 Данные для подключения")
  .row()
  .text("📝 Выбрать тариф")
  .text("❓ Помощь")
  .row()
  .text("🔍 О боте")
  .resized();

// Клавиатура выбора тарифа
export function createTariffsKeyboard(tariffs: Doc<"subscriptionPlans">[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  tariffs.forEach((tariff, index) => {
    keyboard.text(
      `${tariff.name} (${tariff.trafficGB} GB / ${tariff.durationDays} дней)`, 
      `select_tariff:${tariff._id}`
    );
    
    if (index < tariffs.length - 1) {
      keyboard.row();
    }
  });
  
  return keyboard;
}

// Клавиатура подтверждения выбора тарифа
export function createConfirmTariffKeyboard(tariffId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Подтвердить", `confirm_tariff:${tariffId}`)
    .text("❌ Отмена", "cancel_tariff");
}

// Клавиатура для админки
export const adminKeyboard = new Keyboard()
  .text("👥 Пользователи")
  .text("📊 Статистика")
  .row()
  .text("🛠 Управление тарифами")
  .row()
  .text("↩️ Выход из админки")
  .resized();

// Инлайн клавиатура для просмотра VPN-конфигурации
export const viewConnectionKeyboard = new InlineKeyboard()
  .text("🔄 Обновить данные", "refresh_connection"); 