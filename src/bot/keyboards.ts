import { InlineKeyboard, Keyboard } from "grammy";
import { Doc } from "../../convex/_generated/dataModel";

// Главное меню бота
export const mainKeyboard = new Keyboard()
  .text("👤 Профиль")
  .text("📝 Тарифы")
  .row()
  .text("💬 Поддержка")
  .resized();

// Клавиатура для профиля
export const profileKeyboard = new InlineKeyboard()
  .text("🔑 Данные для подключения", "show_connection")
  .row()
  .text("📱 Инструкция по подключению", "show_instructions")
  .row()
  .text("🔄 Обновить статистику", "refresh_stats");

// Клавиатура для инструкции по подключению
export const instructionsKeyboard = new InlineKeyboard()
  .text("💻 Windows (NekoBox)", "instruction_windows")
  .row()
  .text("📱 Android (V2rayNG)", "instruction_android")
  .row()
  .text("📱 iOS (Happ)", "instruction_ios")
  .row()
  .text("↩️ Вернуться в профиль", "back_to_profile");

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
  
  keyboard.row().text("↩️ Вернуться в меню", "back_to_menu");
  return keyboard;
}

// Клавиатура подтверждения выбора тарифа
export function createConfirmTariffKeyboard(tariffId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Подтвердить", `confirm_tariff:${tariffId}`)
    .text("❌ Отмена", "back_to_menu");
}

// Клавиатура для просмотра подписки
export const subscriptionKeyboard = new InlineKeyboard()
  .text("🔄 Продлить подписку", "extend_subscription")
  .row()
  .text("📊 Обновить статистику", "refresh_stats")
  .row()
  .text("↩️ Вернуться в меню", "back_to_menu");

// Инлайн клавиатура для просмотра VPN-конфигурации
export const viewConnectionKeyboard = new InlineKeyboard()
  .text("🔄 Обновить данные", "refresh_connection")
  .row()
  .text("📱 Инструкция по подключению", "show_instructions")
  .row()
  .text("↩️ Вернуться в профиль", "back_to_profile");

// Клавиатура для админки
// TODO: Добавить функционал для админки
export const adminKeyboard = new Keyboard()
  .text("👥 Пользователи")
  .text("📊 Статистика")
  .row()
  .text("🛠 Управление тарифами")
  .row()
  .text("↩️ Выход из админки")
  .resized(); 