// Internal notification helper — not a server action, just a utility
// used by domain action modules that need to send Telegram alerts.

import { fetchStoreConfig } from './store-config-actions';

export async function sendNotification(message: string): Promise<void> {
  try {
    const config = await fetchStoreConfig();
    if (!config.enableNotifications || !config.telegramToken || !config.telegramChatId) {
      return;
    }

    const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
