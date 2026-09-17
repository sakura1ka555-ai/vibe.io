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

  onPosition?: (
    position: number
  ) => void;

  remoteControl?: {
    action: "play" | "pause";
    position: number;
    id: number;
  } | null;
};


/* =================================
   YOUTUBE TYPES
================================= */

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (
    seconds: number,
    allowSeekAhead: boolean
  ) => void;
  getCurrentTime: () => number;
  destroy: () => void;
};

type YouTubeEvent = {
  target: YouTubePlayer;
  data?: number;
};

type YouTubePlayerConstructor = new (
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
      Player: YouTubePlayerConstructor;
    };

    onYouTubeIframeAPIReady?: () => void;
  }
}


/* =================================
   YOUTUBE ID
================================= */

function getYouTubeId(
  url: string
): string | null {

  try {

    const parsed =
      new URL(url);

    const host =
      parsed.hostname
        .toLowerCase()
        .replace(/^www\./, "");


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

      const videoId =
        parsed.searchParams.get("v");

      if (videoId) {
        return videoId;
      }


      const parts =
        parsed.pathname
          .split("/")
          .filter(Boolean);


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


      const shortsIndex =
        parts.indexOf("shorts");

      if (
        shortsIndex >= 0 &&
        parts[shortsIndex + 1]
      ) {

        return parts[
          shortsIndex + 1
        ];

      }

    }

  } catch {}

  return null;
}


/* =================================
   RUTUBE ID
================================= */

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

  } catch {}

  return null;
}


/* =================================
   VK DATA
================================= */

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
        parsed.searchParams.get("oid");

      const id =
        parsed.searchParams.get("id");

      const hash =
        parsed.searchParams.get("hash");


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
      oid: match[1],
      id: match[2],
      hash: null
    };

  } catch {}

  return null;
}


/* =================================
   RUTUBE MESSAGE
================================= */

type RutubeMessage = {
  type?: string;

  data?: {
    state?: string;
    time?: number;
    playerId?: string;
  };
};


/* =================================
   REMOTE SEEK EVENT
================================= */

type RemoteSeekEvent = CustomEvent<{
  position: number;
}>;


/* =================================
   PLAYER
================================= */

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
    useRef<HTMLDivElement | null>(null);

  const rutubeIframe =
    useRef<HTMLIFrameElement | null>(null);

  const player =
    useRef<YouTubePlayer | null>(null);


  const ready =
    useRef(false);

  const rutubeReady =
    useRef(false);


  /*
    TRUE while a remote command
    is being applied.

    During this period we ignore
    player events generated by
    our own remote command.
  */

  const applyingRemote =
    useRef(false);


  const lastRemoteId =
    useRef<number | null>(null);


  const rutubeLastTime =
    useRef(0);


  const previousRutubeTime =
    useRef<number | null>(null);


  const lastLocalSeek =
    useRef<number | null>(null);


  const positionCallback =
    useRef(onPosition);

  const controlCallback =
    useRef(onControl);

  const seekCallback =
    useRef(onSeek);


  const youtubeId =
    getYouTubeId(videoUrl);

  const rutubeId =
    getRutubeId(videoUrl);

  const vkData =
    getVKVideoData(videoUrl);


  /* =================================
     CALLBACK REFS
  ================================= */

  useEffect(() => {

    positionCallback.current =
      onPosition;

  }, [onPosition]);


  useEffect(() => {

    controlCallback.current =
      onControl;

  }, [onControl]);


  useEffect(() => {

    seekCallback.current =
      onSeek;

  }, [onSeek]);


  /* =================================
     REMOTE SEEK
  ================================= */

  useEffect(() => {

    function handleRemoteSeek(
      event: Event
    ) {

      const customEvent =
        event as RemoteSeekEvent;


      const rawPosition =
        Number(
          customEvent.detail?.position
        );


      if (
        !Number.isFinite(rawPosition)
      ) {

        return;

      }


      const position =
        Math.max(
          0,
          rawPosition
        );


      /*
        =============================
        YOUTUBE
        =============================
      */

      if (
        youtubeId &&
        ready.current &&
        player.current
      ) {

        applyingRemote.current =
          true;


        player.current.seekTo(
          position,
          true
        );


        window.setTimeout(() => {

          applyingRemote.current =
            false;

        }, 700);


        return;

      }


      /*
        =============================
        RUTUBE
        =============================
      */

      if (
        rutubeId &&
        rutubeReady.current &&
        rutubeIframe.current
      ) {

        const iframe =
          rutubeIframe.current;


        applyingRemote.current =
          true;


        rutubeLastTime.current =
          position;

        previousRutubeTime.current =
          position;

        lastLocalSeek.current =
          position;


        iframe.contentWindow?.postMessage(
          JSON.stringify({
            type:
              "player:setCurrentTime",

            data: {
              time:
                position
            }
          }),
          "https://rutube.ru"
        );


        window.setTimeout(() => {

          if (
            rutubeReady.current &&
            rutubeIframe.current
          ) {

            rutubeIframe.current.contentWindow?.postMessage(
              JSON.stringify({
                type:
                  "player:setCurrentTime",

                data: {
                  time:
                    position
                }
              }),
              "https://rutube.ru"
            );

          }

        }, 300);


        window.setTimeout(() => {

          applyingRemote.current =
            false;

          lastLocalSeek.current =
            null;

        }, 800);

      }

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


  /* =================================
     YOUTUBE
  ================================= */

  useEffect(() => {

    if (!youtubeId) {
      return;
    }


    let cancelled = false;


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

            videoId: youtubeId,

            playerVars: {
              autoplay: 0,
              controls: 1,
              playsinline: 1,
              rel: 0,
              origin:
                window.location.origin
            },

            events: {

              onReady: event => {

                if (cancelled) {
                  return;
                }


                ready.current =
                  true;


                if (
                  initialPosition > 0
                ) {

                  applyingRemote.current =
                    true;


                  event.target.seekTo(
                    initialPosition,
                    true
                  );


                  window.setTimeout(() => {

                    applyingRemote.current =
                      false;

                  }, 500);

                }

              },


              onStateChange: event => {

                if (
                  cancelled ||
                  applyingRemote.current
                ) {

                  return;

                }


                const target =
                  event.target;


                const position =
                  Math.max(
                    0,
                    target.getCurrentTime()
                  );


                /*
                  YOUTUBE:
                  1 = PLAYING
                  2 = PAUSED
                */

                if (
                  event.data === 1
                ) {

                  controlCallback.current?.(
                    "play",
                    position
                  );

                  return;

                }


                if (
                  event.data === 2
                ) {

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


    if (window.YT?.Player) {

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


      if (!existingScript) {

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


      if (player.current) {

        player.current.destroy();

        player.current =
          null;

      }

    };

  }, [
    youtubeId
  ]);


  /* =================================
     RUTUBE
  ================================= */

  useEffect(() => {

    if (!rutubeId) {
      return;
    }


    rutubeReady.current =
      false;

    applyingRemote.current =
      false;

    lastRemoteId.current =
      null;

    rutubeLastTime.current =
      initialPosition;

    previousRutubeTime.current =
      initialPosition;

    lastLocalSeek.current =
      null;


    function sendRutube(
      type: string,
      data: Record<string, unknown> = {}
    ) {

      const iframe =
        rutubeIframe.current;


      if (
        !iframe ||
        !rutubeReady.current
      ) {

        return;

      }


      iframe.contentWindow?.postMessage(
        JSON.stringify({
          type,
          data
        }),
        "https://rutube.ru"
      );

    }


    function applyRutubeControl(
      action: "play" | "pause",
      position: number
    ) {

      const iframe =
        rutubeIframe.current;


      if (
        !iframe ||
        !rutubeReady.current
      ) {

        return;

      }


      const safePosition =
        Math.max(
          0,
          Number(position) || 0
        );


      applyingRemote.current =
        true;


      rutubeLastTime.current =
        safePosition;

      previousRutubeTime.current =
        safePosition;


      /*
        First set position.
      */

      sendRutube(
        "player:setCurrentTime",
        {
          time:
            safePosition
        }
      );


      /*
        Then explicitly PLAY or PAUSE.
      */

      window.setTimeout(() => {

        if (
          rutubeReady.current
        ) {

          sendRutube(
            action === "play"
              ? "player:play"
              : "player:pause"
          );

        }

      }, 300);


      /*
        Repeat the state command.
        This is important for RUTUBE:
        sometimes the first command
        is ignored while iframe is
        synchronizing.
      */

      window.setTimeout(() => {

        if (
          rutubeReady.current
        ) {

          sendRutube(
            action === "play"
              ? "player:play"
              : "player:pause"
          );

        }

      }, 700);


      window.setTimeout(() => {

        applyingRemote.current =
          false;

      }, 1200);

    }


    function handleMessage(
      event: MessageEvent
    ) {

      if (
        event.origin !==
        "https://rutube.ru"
      ) {

        return;

      }


      let message:
        RutubeMessage | null =
        null;


      try {

        if (
          typeof event.data ===
          "string"
        ) {

          message =
            JSON.parse(
              event.data
            );

        } else {

          message =
            event.data;

        }

      } catch {

        return;

      }


      if (!message) {
        return;
      }


      /* =============================
         READY
      ============================= */

      if (
        message.type ===
        "player:ready"
      ) {

        rutubeReady.current =
          true;


        rutubeLastTime.current =
          initialPosition;

        previousRutubeTime.current =
          initialPosition;


        /*
          Always apply initial position.
        */

        if (
          initialPosition > 0
        ) {

          applyingRemote.current =
            true;


          sendRutube(
            "player:setCurrentTime",
            {
              time:
                initialPosition
            }
          );


          window.setTimeout(() => {

            applyingRemote.current =
              false;

          }, 500);

        }


        /*
          Apply initial PLAY/PAUSE.
        */

        window.setTimeout(() => {

          if (
            !rutubeReady.current
          ) {

            return;

          }


          applyRutubeControl(
            initialAction,
            initialPosition
          );

        }, 700);


        return;

      }


      /* =============================
         CURRENT TIME
      ============================= */

      if (
        message.type ===
        "player:currentTime"
      ) {

        const time =
          Number(
            message.data?.time
          );


        if (
          !Number.isFinite(time)
        ) {

          return;

        }


        const previous =
          previousRutubeTime.current;


        rutubeLastTime.current =
          time;


        positionCallback.current?.(
          time
        );


        /*
          Ignore position changes
          caused by our own remote
          command.
        */

        if (
          applyingRemote.current
        ) {

          previousRutubeTime.current =
            time;

          return;

        }


        if (
          previous === null
        ) {

          previousRutubeTime.current =
            time;

          return;

        }


        const delta =
          Math.abs(
            time -
            previous
          );


        /*
          Manual seek detection.

          Normal playback changes by
          about 1 second.

          A jump of 2+ seconds is
          treated as a manual seek.
        */

        if (
          delta >= 2
        ) {

          if (
            lastLocalSeek.current !==
              null
          ) {

            if (
              Math.abs(
                time -
                lastLocalSeek.current
              ) < 2
            ) {

              lastLocalSeek.current =
                null;

              previousRutubeTime.current =
                time;

              return;

            }

          }


          seekCallback.current?.(
            time
          );

        }


        previousRutubeTime.current =
          time;


        return;

      }


      /* =============================
         STATE
      ============================= */

      if (
        message.type ===
        "player:changeState"
      ) {

        /*
          VERY IMPORTANT:

          If this state came from
          our remote command, do not
          send it back to server.
        */

        if (
          applyingRemote.current
        ) {

          return;

        }


        const state =
          message.data?.state;


        if (
          state === "playing"
        ) {

          controlCallback.current?.(
            "play",
            rutubeLastTime.current
          );

          return;

        }


        if (
          state === "paused"
        ) {

          controlCallback.current?.(
            "pause",
            rutubeLastTime.current
          );

          return;

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

      applyingRemote.current =
        false;

    };

  }, [
    rutubeId,
    initialAction,
    initialPosition
  ]);


  /* =================================
     YOUTUBE INITIAL POSITION
  ================================= */

  useEffect(() => {

    if (
      !youtubeId ||
      !ready.current ||
      !player.current
    ) {

      return;

    }


    if (
      initialPosition > 0
    ) {

      applyingRemote.current =
        true;


      player.current.seekTo(
        initialPosition,
        true
      );


      window.setTimeout(() => {

        applyingRemote.current =
          false;

      }, 500);

    }

  }, [
    youtubeId,
    initialPosition
  ]);


  /* =================================
     REMOTE CONTROL
  ================================= */

  useEffect(() => {

    if (!remoteControl) {
      return;
    }


    /*
      Do not process the same
      server command twice.
    */

    if (
      lastRemoteId.current ===
      remoteControl.id
    ) {

      return;

    }


    lastRemoteId.current =
      remoteControl.id;


    const position =
      Math.max(
        0,
        Number(
          remoteControl.position
        ) || 0
      );


    /* =============================
       YOUTUBE
    ============================= */

    if (
      youtubeId &&
      ready.current &&
      player.current
    ) {

      const target =
        player.current;


      applyingRemote.current =
        true;


      /*
        Position first.
      */

      target.seekTo(
        position,
        true
      );


      /*
        Then explicit state.
      */

      if (
        remoteControl.action ===
        "play"
      ) {

        target.playVideo();

      } else {

        target.pauseVideo();

      }


      /*
        Keep remote protection long
        enough for YouTube to emit
        its own state-change event.
      */

      window.setTimeout(() => {

        applyingRemote.current =
          false;

      }, 1200);


      return;

    }


    /* =============================
       RUTUBE
    ============================= */

    if (
      rutubeId &&
      rutubeReady.current
    ) {

      applyRutubeRemote(
        remoteControl.action,
        position
      );

    }

  }, [
    remoteControl,
    youtubeId,
    rutubeId
  ]);


  /* =================================
     RUTUBE REMOTE
  ================================= */

  function applyRutubeRemote(
    action: "play" | "pause",
    position: number
  ) {

    const iframe =
      rutubeIframe.current;


    if (
      !iframe ||
      !rutubeReady.current
    ) {

      return;

    }


    const safePosition =
      Math.max(
        0,
        Number(position) || 0
      );


    applyingRemote.current =
      true;


    rutubeLastTime.current =
      safePosition;

    previousRutubeTime.current =
      safePosition;


    /*
      Set position.
    */

    iframe.contentWindow?.postMessage(
      JSON.stringify({
        type:
          "player:setCurrentTime",

        data: {
          time:
            safePosition
        }
      }),
      "https://rutube.ru"
    );


    /*
      Explicit PLAY / PAUSE.
    */

    window.setTimeout(() => {

      iframe.contentWindow?.postMessage(
        JSON.stringify({
          type:
            action === "play"
              ? "player:play"
              : "player:pause",

          data: {}
        }),
        "https://rutube.ru"
      );

    }, 300);


    /*
      Repeat PLAY / PAUSE.
    */

    window.setTimeout(() => {

      iframe.contentWindow?.postMessage(
        JSON.stringify({
          type:
            action === "play"
              ? "player:play"
              : "player:pause",

          data: {}
        }),
        "https://rutube.ru"
      );

    }, 700);


    window.setTimeout(() => {

      applyingRemote.current =
        false;

    }, 1200);

  }


  /* =================================
     YOUTUBE POSITION
  ================================= */

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


        const position =
          player.current.getCurrentTime();


        positionCallback.current?.(
          position
        );

      }, 1000);


    return () => {

      window.clearInterval(
        timer
      );

    };

  }, [
    youtubeId
  ]);


  /* =================================
     YOUTUBE
  ================================= */

  if (youtubeId) {

    return (
      <div
        ref={playerContainer}
        className="youtube-player"
      />
    );

  }


  /* =================================
     RUTUBE
  ================================= */

  if (rutubeId) {

    return (
      <iframe
        ref={rutubeIframe}
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


  /* =================================
     VK
  ================================= */

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


    if (vkData.hash) {

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


  /* =================================
     ERROR
  ================================= */

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


export default VideoPlayer;
