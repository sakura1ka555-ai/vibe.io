export function initTelegram() {

  const tg =
    window.Telegram?.WebApp;


  if (!tg) {

    console.log(
      "Telegram WebApp не найден"
    );

    return null;

  }


  tg.ready();

  tg.expand();


  return tg;

}


export function getTelegramUser() {

  const tg =
    window.Telegram?.WebApp;


  if (!tg) {

    return null;

  }


  return (
    tg.initDataUnsafe?.user ||
    null
  );

}
