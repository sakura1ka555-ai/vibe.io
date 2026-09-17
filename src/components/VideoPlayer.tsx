import {
  useEffect,
  useRef
} from "react";


type Props = {
  videoUrl: string;

  initialPosition?: number;

  initialAction?: "play" | "pause";

  onControl?: (
    action: "play" | "pause",
    position: number
  ) => void;

  onSeek?: (
    position: number
  ) => void;

  /*
    Только локальная позиция.

    ВАЖНО:
    не отправляй её на сервер каждую секунду.
  */
  onPosition?: (
    position: number
  ) => void;

  remoteControl?: {
    action: "play" | "pause";
    position: number;
    id: number;
  } | null;
};


/* =====================================================
   YOUTUBE
===================================================== */

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;

  seekTo: (
    seconds: number,
    allowSeekAhead: boolean
  ) => void;

  getCurrentTime: () => number;

  getPlayerState: () => number;

  destroy: () => void;
};


type YouTubeEvent = {
  target: YouTubePlayer;
  data?: number;
};


type YouTubePlayerConstructor =
  new (
    element: HTMLElement,
    options: {
      videoId: string;

      playerVars?: {
        autoplay?: number;
        controls?: number;
        playsinline?: number;
        origin?: string;
        rel?: number;
      };

      events?: {
        onReady?: (
          event: YouTubeEvent
        ) => void;

        onStateChange?: (
          event: YouTubeEvent
        ) => void;
      };
    }
  ) => YouTubePlayer;


declare global {
  interface Window {

    YT?: {
      Player:
        YouTubePlayerConstructor;
    };

    onYouTubeIframeAPIReady?: () => void;

  }
}


/* =====================================================
   HELPERS
===================================================== */

function clampPosition(
  value: unknown
) {

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {

    return 0;

  }

  return Math.max(
    0,
    number
  );

}


function getYouTubeId(
  url: string
): string | null {

  try {

    const parsed =
      new URL(url);

    const host =
      parsed.hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );


    if (
      host === "youtu.be"
    ) {

      return (
        parsed.pathname
          .split("/")
          .filter(Boolean)[0] ||
        null
      );

    }


    if (
      host === "youtube.com" ||
      host === "m.youtube.com"
    ) {

      const v =
        parsed.searchParams.get(
          "v"
        );

      if (v) {
        return v;
      }


      const parts =
        parsed.pathname
          .split("/")
          .filter(Boolean);


      for (
        const type of [
          "embed",
          "shorts",
          "live"
        ]
      ) {

        const index =
          parts.indexOf(type);

        if (
          index >= 0 &&
          parts[index + 1]
        ) {

          return parts[
            index + 1
          ];

        }

      }

    }

  } catch {

    // invalid URL

  }

  return null;

}


function getRutubeId(
  url: string
): string | null {

  try {

    const parsed =
      new URL(url);

    const parts =
      parsed.pathname
        .split("/")
        .filter(Boolean);


    const videoIndex =
      parts.indexOf("video");

    if (
      videoIndex >= 0 &&
      parts[videoIndex + 1]
    ) {

      return parts[
        videoIndex + 1
      ];

    }


    const embedIndex =
      parts.indexOf("embed");

    if (
      embedIndex >= 0 &&
      parts[embedIndex + 1]
    ) {

      return parts[
        embedIndex + 1
      ];

    }

  } catch {

    // invalid URL

  }

  return null;

}


function getVKVideoData(
  url: string
) {

  try {

    const parsed =
      new URL(url);


    if (
      parsed.pathname.includes(
        "video_ext.php"
      )
    ) {

      const oid =
        parsed.searchParams.get(
          "oid"
        );

      const id =
        parsed.searchParams.get(
          "id"
        );

      const hash =
        parsed.searchParams.get(
          "hash"
        );


      if (
        oid &&
        id
      ) {

        return {
          oid,
          id,
          hash
        };

      }

    }


    const match =
      parsed.pathname.match(
        /video(-?\d+)_([0-9]+)/
      );


    if (!match) {
      return null;
    }


    return {
      oid:
        match[1],

      id:
        match[2],

      hash:
        null
    };

  } catch {

    return null;

  }

}


/* =====================================================
   RUTUBE
===================================================== */

type RutubeMessage = {
  type?: string;

  data?: {
    state?: string;
    time?: number;
    playerId?: string;
  };
};


function parseRutubeMessage(
  value: unknown
): RutubeMessage | null {

  try {

    if (
      typeof value === "string"
    ) {

      return JSON.parse(value);

    }

    if (
      value &&
      typeof value === "object"
    ) {

      return value as RutubeMessage;

    }

  } catch {

    return null;

  }

  return null;

}


/* =====================================================
   COMPONENT
===================================================== */

function VideoPlayer({
  videoUrl,
  initialPosition = 0,
  initialAction = "pause",
  onControl,
  onSeek,
  onPosition,
  remoteControl
}: Props) {

  const playerContainer =
    useRef<HTMLDivElement | null>(
      null
    );


  const rutubeIframe =
    useRef<HTMLIFrameElement | null>(
      null
    );


  const player =
    useRef<YouTubePlayer | null>(
      null
    );


  const ready =
    useRef(false);


  const rutubeReady =
    useRef(false);


  /*
    Защита от событий,
    вызванных нашей собственной
    remote-командой.
  */

  const applyingRemote =
    useRef(false);


  const remoteTimer =
    useRef<number | null>(
      null
    );


  const lastRemoteId =
    useRef<number | null>(
      null
    );


  /*
    Последнее известное время.

    Используется для определения
    ручной перемотки.
  */

  const lastPosition =
    useRef<number | null>(
      null
    );


  /*
    Последнее известное состояние.
  */

  const lastState =
    useRef<
      "playing" |
      "paused" |
      null
    >(null);


  /*
    Защита от повторного initial state.
  */

  const initialApplied =
    useRef(false);


  const positionCallback =
    useRef(onPosition);

  const controlCallback =
    useRef(onControl);

  const seekCallback =
    useRef(onSeek);


  const youtubeId =
    getYouTubeId(
      videoUrl
    );


  const rutubeId =
    getRutubeId(
      videoUrl
    );


  const vkData =
    getVKVideoData(
      videoUrl
    );


  useEffect(() => {

    positionCallback.current =
      onPosition;

  }, [
    onPosition
  ]);


  useEffect(() => {

    controlCallback.current =
      onControl;

  }, [
    onControl
  ]);


  useEffect(() => {

    seekCallback.current =
      onSeek;

  }, [
    onSeek
  ]);


  /* ===================================================
     REMOTE SEEK
  =================================================== */

  useEffect(() => {

    function handleRemoteSeek(
      event: Event
    ) {

      const customEvent =
        event as CustomEvent<{
          position?: number;
        }>;


      const position =
        clampPosition(
          customEvent.detail?.position
        );


      applyingRemote.current =
        true;


      /* ---------------------------
         YOUTUBE
      --------------------------- */

      if (
        youtubeId &&
        ready.current &&
        player.current
      ) {

        player.current.seekTo(
          position,
          true
        );


        lastPosition.current =
          position;


        if (
          remoteTimer.current !==
          null
        ) {

          window.clearTimeout(
            remoteTimer.current
          );

        }


        remoteTimer.current =
          window.setTimeout(() => {

            applyingRemote.current =
              false;

          }, 1000);


        return;

      }


      /* ---------------------------
         RUTUBE
      --------------------------- */

      if (
        rutubeId &&
        rutubeReady.current &&
        rutubeIframe.current
      ) {

        sendRutube(
          rutubeIframe.current,
          "player:setCurrentTime",
          {
            time:
              position
          }
        );


        lastPosition.current =
          position;


        if (
          remoteTimer.current !==
          null
        ) {

          window.clearTimeout(
            remoteTimer.current
          );

        }


        remoteTimer.current =
          window.setTimeout(() => {

            applyingRemote.current =
              false;

          }, 1000);

        return;

      }


      applyingRemote.current =
        false;

    }


    window.addEventListener(
      "vibe-video-seek",
      handleRemoteSeek
    );


    return () => {

      window.removeEventListener(
        "vibe-video-seek",
        handleRemoteSeek
      );

    };

  }, [
    youtubeId,
    rutubeId
  ]);


  /* ===================================================
     YOUTUBE
  =================================================== */

  useEffect(() => {

    if (!youtubeId) {
      return;
    }


    let cancelled =
      false;


    function applyInitialState(
      target: YouTubePlayer
    ) {

      if (
        initialApplied.current
      ) {

        return;

      }


      initialApplied.current =
        true;


      const position =
        clampPosition(
          initialPosition
        );


      applyingRemote.current =
        true;


      if (
        position > 0
      ) {

        target.seekTo(
          position,
          true
        );

      }


      window.setTimeout(() => {

        if (cancelled) {
          return;
        }


        if (
          initialAction === "play"
        ) {

          target.playVideo();

        } else {

          target.pauseVideo();

        }

      }, 150);


      window.setTimeout(() => {

        applyingRemote.current =
          false;

      }, 1200);

    }


    function createPlayer() {

      if (
        cancelled ||
        !playerContainer.current ||
        !window.YT?.Player ||
        player.current
      ) {

        return;

      }


      player.current =
        new window.YT.Player(
          playerContainer.current,
          {

            videoId:
              youtubeId,

            playerVars: {
              autoplay: 0,
              controls: 1,
              playsinline: 1,
              rel: 0,
              origin:
                window.location.origin
            },

            events: {

              onReady:
                event => {

                  if (
                    cancelled
                  ) {
                    return;
                  }


                  ready.current =
                    true;


                  lastPosition.current =
                    clampPosition(
                      event.target
                        .getCurrentTime()
                    );


                  applyInitialState(
                    event.target
                  );

                },


              onStateChange:
                event => {

                  if (
                    cancelled ||
                    applyingRemote.current
                  ) {

                    return;

                  }


                  const target =
                    event.target;


                  const position =
                    clampPosition(
                      target.getCurrentTime()
                    );


                  /*
                    1 = PLAYING
                    2 = PAUSED
                  */

                  if (
                    event.data === 1
                  ) {

                    lastState.current =
                      "playing";


                    controlCallback.current?.(
                      "play",
                      position
                    );


                    return;

                  }


                  if (
                    event.data === 2
                  ) {

                    lastState.current =
                      "paused";


                    controlCallback.current?.(
                      "pause",
                      position
                    );

                  }

                }

            }

          }
        );

    }


    if (
      window.YT?.Player
    ) {

      createPlayer();

    } else {

      const previous =
        window.onYouTubeIframeAPIReady;


      window.onYouTubeIframeAPIReady =
        () => {

          previous?.();

          createPlayer();

        };


      const existingScript =
        document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]'
        );


      if (
        !existingScript
      ) {

        const script =
          document.createElement(
            "script"
          );


        script.src =
          "https://www.youtube.com/iframe_api";


        script.async =
          true;


        document.head.appendChild(
          script
        );

      }

    }


    return () => {

      cancelled =
        true;


      ready.current =
        false;


      initialApplied.current =
        false;


      if (
        remoteTimer.current !==
        null
      ) {

        window.clearTimeout(
          remoteTimer.current
        );

        remoteTimer.current =
          null;

      }


      if (
        player.current
      ) {

        player.current.destroy();

        player.current =
          null;

      }

    };

  }, [
    youtubeId
  ]);


  /* ===================================================
     YOUTUBE POLLING

     Нужен именно для обнаружения
     ручной перемотки через UI YouTube.
  =================================================== */

  useEffect(() => {

    if (!youtubeId) {
      return;
    }


    const timer =
      window.setInterval(() => {

        if (
          !ready.current ||
          !player.current
        ) {

          return;

        }


        const target =
          player.current;


        const position =
          clampPosition(
            target.getCurrentTime()
          );


        const previous =
          lastPosition.current;


        lastPosition.current =
          position;


        positionCallback.current?.(
          position
        );


        if (
          applyingRemote.current
        ) {

          return;

        }


        if (
          previous === null
        ) {

          return;

        }


        const delta =
          Math.abs(
            position -
            previous
          );


        /*
          Обычное воспроизведение:
          ~0.25-1 сек.

          Скачок > 1.5 сек =
          ручная перемотка.
        */

        if (
          delta >= 1.5
        ) {

          seekCallback.current?.(
            position
          );

        }

      }, 250);


    return () => {

      window.clearInterval(
        timer
      );

    };

  }, [
    youtubeId
  ]);


  /* ===================================================
     RUTUBE
  =================================================== */

  useEffect(() => {

    if (!rutubeId) {
      return;
    }


    rutubeReady.current =
      false;


    initialApplied.current =
      false;


    lastPosition.current =
      clampPosition(
        initialPosition
      );


    function handleMessage(
      event: MessageEvent
    ) {

      if (
        event.origin !==
        "https://rutube.ru"
      ) {

        return;

      }


      const message =
        parseRutubeMessage(
          event.data
        );


      if (!message) {
        return;
      }


      /* ---------------------------
         READY
      --------------------------- */

      if (
        message.type ===
        "player:ready"
      ) {

        rutubeReady.current =
          true;


        if (
          initialApplied.current
        ) {

          return;

        }


        initialApplied.current =
          true;


        const iframe =
          rutubeIframe.current;


        if (!iframe) {
          return;
        }


        const position =
          clampPosition(
            initialPosition
          );


        applyingRemote.current =
          true;


        /*
          RUTUBE требует,
          чтобы команды play/pause
          отправлялись после ready.
        */

        sendRutube(
          iframe,
          "player:setCurrentTime",
          {
            time:
              position
          }
        );


        window.setTimeout(() => {

          if (
            !rutubeReady.current
          ) {

            return;

          }


          sendRutube(
            iframe,
            initialAction === "play"
              ? "player:play"
              : "player:pause"
          );

        }, 250);


        window.setTimeout(() => {

          if (
            !rutubeReady.current
          ) {

            return;

          }


          sendRutube(
            iframe,
            initialAction === "play"
              ? "player:play"
              : "player:pause"
          );

        }, 700);


        window.setTimeout(() => {

          applyingRemote.current =
            false;

        }, 1300);


        return;

      }


      /* ---------------------------
         CURRENT TIME
      --------------------------- */

      if (
        message.type ===
        "player:currentTime"
      ) {

        const position =
          clampPosition(
            message.data?.time
          );


        const previous =
          lastPosition.current;


        lastPosition.current =
          position;


        positionCallback.current?.(
          position
        );


        if (
          applyingRemote.current
        ) {

          return;

        }


        if (
          previous === null
        ) {

          return;

        }


        const delta =
          Math.abs(
            position -
            previous
          );


        if (
          delta >= 1.5
        ) {

          seekCallback.current?.(
            position
          );

        }


        return;

      }


      /* ---------------------------
         STATE
      --------------------------- */

      if (
        message.type ===
        "player:changeState"
      ) {

        if (
          applyingRemote.current
        ) {

          return;

        }


        const state =
          message.data?.state;


        const position =
          lastPosition.current ??
          0;


        if (
          state === "playing"
        ) {

          if (
            lastState.current !==
            "playing"
          ) {

            lastState.current =
              "playing";


            controlCallback.current?.(
              "play",
              position
            );

          }


          return;

        }


        if (
          state === "paused"
        ) {

          if (
            lastState.current !==
            "paused"
          ) {

            lastState.current =
              "paused";


            controlCallback.current?.(
              "pause",
              position
            );

          }

        }

      }

    }


    window.addEventListener(
      "message",
      handleMessage
    );


    return () => {

      window.removeEventListener(
        "message",
        handleMessage
      );


      rutubeReady.current =
        false;

    };

  }, [
    rutubeId,
    initialPosition,
    initialAction
  ]);


  /* ===================================================
     REMOTE CONTROL
  =================================================== */

  useEffect(() => {

    if (!remoteControl) {
      return;
    }


    if (
      lastRemoteId.current ===
      remoteControl.id
    ) {

      return;

    }


    lastRemoteId.current =
      remoteControl.id;


    const position =
      clampPosition(
        remoteControl.position
      );


    applyingRemote.current =
      true;


    /* ---------------------------
       YOUTUBE
    --------------------------- */

    if (
      youtubeId &&
      ready.current &&
      player.current
    ) {

      const target =
        player.current;


      target.seekTo(
        position,
        true
      );


      window.setTimeout(() => {

        if (
          remoteControl.action ===
          "play"
        ) {

          target.playVideo();

        } else {

          target.pauseVideo();

        }

      }, 120);


      lastPosition.current =
        position;


      if (
        remoteTimer.current !==
        null
      ) {

        window.clearTimeout(
          remoteTimer.current
        );

      }


      remoteTimer.current =
        window.setTimeout(() => {

          applyingRemote.current =
            false;

        }, 1300);


      return;

    }


    /* ---------------------------
       RUTUBE
    --------------------------- */

    if (
      rutubeId &&
      rutubeReady.current &&
      rutubeIframe.current
    ) {

      const iframe =
        rutubeIframe.current;


      sendRutube(
        iframe,
        "player:setCurrentTime",
        {
          time:
            position
        }
      );


      window.setTimeout(() => {

        if (
          !rutubeReady.current
        ) {

          return;

        }


        sendRutube(
          iframe,
          remoteControl.action === "play"
            ? "player:play"
            : "player:pause"
        );

      }, 250);


      window.setTimeout(() => {

        if (
          !rutubeReady.current
        ) {

          return;

        }


        sendRutube(
          iframe,
          remoteControl.action === "play"
            ? "player:play"
            : "player:pause"
        );

      }, 700);


      lastPosition.current =
        position;


      if (
        remoteTimer.current !==
        null
      ) {

        window.clearTimeout(
          remoteTimer.current
        );

      }


      remoteTimer.current =
        window.setTimeout(() => {

          applyingRemote.current =
            false;

        }, 1300);


      return;

    }


    applyingRemote.current =
      false;

  }, [
    remoteControl,
    youtubeId,
    rutubeId
  ]);


  /* ===================================================
     VK
     
     VK iframe не даёт нам такого же
     универсального JS API управления,
     поэтому полноценная синхронизация
     через iframe здесь невозможна
     тем же способом.
  =================================================== */

  if (youtubeId) {

    return (
      <div
        ref={
          playerContainer
        }
        className="youtube-player"
      />
    );

  }


  if (rutubeId) {

    return (
      <iframe
        ref={
          rutubeIframe
        }
        className="embedded-player"
        src={
          `https://rutube.ru/play/embed/${rutubeId}`
        }
        title="RUTUBE"
        allow="
          autoplay;
          encrypted-media;
          fullscreen;
          picture-in-picture;
          clipboard-write
        "
        frameBorder="0"
        allowFullScreen
      />
    );

  }


  if (vkData) {

    const params =
      new URLSearchParams();


    params.set(
      "oid",
      vkData.oid
    );


    params.set(
      "id",
      vkData.id
    );


    if (
      vkData.hash
    ) {

      params.set(
        "hash",
        vkData.hash
      );

    }


    params.set(
      "hd",
      "3"
    );


    return (
      <iframe
        className="embedded-player"
        src={
          `https://vkvideo.ru/video_ext.php?${params.toString()}`
        }
        title="VK Video"
        allow="
          autoplay;
          encrypted-media;
          fullscreen;
          picture-in-picture
        "
        frameBorder="0"
        allowFullScreen
      />
    );

  }


  return (
    <div className="player-message">

      <div className="player-message-icon">
        V
      </div>

      <div className="player-message-title">
        Видео не найдено
      </div>

      <div className="player-message-text">

        Проверь ссылку на видео.

        <br />

        Поддерживаются
        YouTube, RUTUBE и VK Video.

      </div>

    </div>
  );

}


/* =====================================================
   RUTUBE COMMAND
===================================================== */

function sendRutube(
  iframe: HTMLIFrameElement,
  type: string,
  data: Record<string, unknown> = {}
) {

  iframe.contentWindow?.postMessage(
    JSON.stringify({
      type,
      data
    }),
    "https://rutube.ru"
  );

}


export default VideoPlayer;
