interface Window {
  Telegram?: {
    WebApp: {
      ready: () => void;

      initDataUnsafe: {
        user?: {
          id: number;
          first_name: string;
          username?: string;
          photo_url?: string;
        };
      };
    };
  };
}
