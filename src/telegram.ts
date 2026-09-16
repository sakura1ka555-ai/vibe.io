export function getTelegramUser() {
  const tg = window.Telegram?.WebApp;

  if (!tg) {
    return null;
  }

  tg.ready();

  return tg.initDataUnsafe?.user || null;
}
