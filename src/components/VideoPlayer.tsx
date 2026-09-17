import {
  useEffect,
  useRef
} from "react";


type VideoAction =
  | "play"
  | "pause";


type Props = {
  videoUrl: string;

  initialPosition?: number;

  initialAction?: VideoAction;

  onControl?: (
    action: VideoAction,
    position: number
  ) => void;

  onSeek?: (
    position: number
  ) => void;

  onPosition?: (
    position: number
  ) => void;

  remoteControl?: {
    action: VideoAction;
    position: number;
    id: number;
  } | null;
};


/*
==================================================
YOUTUBE TYPES
==================================================
*/

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


/*
==================================================
HELPERS
==================================================
*/

function clampPosition(
  value: unknown
): number {

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
    return null;
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
      parts.indexOf(
        "video"
      );

    if (
      videoIndex >= 0 &&
      parts[videoIndex + 1]
    ) {

      return parts[
        videoIndex + 1
      ];
    }


    const embedIndex =
      parts.indexOf(
        "embed"
      );

    if (
      embedIndex >= 0 &&
      parts[embedIndex + 1]
    ) {

      return parts[
        embedIndex + 1
      ];
    }

  } catch {
    return null;
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


/*
==================================================
RUTUBE
==================================================
*/

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
      typeof value ===
      "string"
    ) {

      return JSON.parse(
        value
      );
    }

    if (
      value &&
      typeof value ===
      "object"
    ) {

      return value as RutubeMessage;
    }

  } catch {
    return null;
  }

  return null;
}


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


/*
==================================================
COMPONENT
==================================================
*/

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


  /*
  READY FLAGS
  */

  const youtubeReady =
    useRef(false);

  const rutubeReady =
    useRef(false);


  /*
  TRUE while applying a
  server/remote command.
  */

  const applyingRemote =
    useRef(false);


  /*
  Timers
  */

  const remoteTimer =
    useRef<number | null>(
      null
    );


  /*
  Last remote command ID
  */

  const lastRemoteId =
    useRef<number | null>(
      null
    );


  /*
  Last position
  */

  const lastPosition =
    useRef<number | null>(
      null
    );


  /*
  Last state
  */

  const lastState =
    useRef<
      "playing" |
      "paused" |
      null
    >(null);


  /*
  Initial state signature.
  */

  const lastInitialSignature =
    useRef<string | null>(
      null
    );


  /*
  Callbacks
  */

  const controlCallback =
    useRef(onControl);

  const seekCallback =
    useRef(onSeek);

  const positionCallback =
    useRef(onPosition);


  /*
  IDs
  */

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


  /*
==================================================
LATEST CALLBACKS
==================================================
*/

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


  useEffect(() => {

    positionCallback.current =
      onPosition;

  }, [
    onPosition
  ]);


/*
==================================================
CLEAR REMOTE TIMER
==================================================
*/

  function clearRemoteTimer() {

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
  }


/*
==================================================
MARK REMOTE
==================================================
*/

  function markRemote(
    duration = 1400
  ) {

    applyingRemote.current =
      true;

    clearRemoteTimer();

    remoteTimer.current =
      window.setTimeout(() => {

        applyingRemote.current =
          false;

      }, duration);
  }


/*
==================================================
YOUTUBE INITIAL STATE
==================================================
*/

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
        cancelled
      ) {
        return;
      }

      const position =
        clampPosition(
          initialPosition
        );

      const action =
        initialAction === "play"
          ? "play"
          : "pause";

      const signature =
        `${position}|${action}`;


      if (
        lastInitialSignature.current ===
        signature
      ) {
        return;
      }

      lastInitialSignature.current =
        signature;


      markRemote();

      lastPosition.current =
        position;

      lastState.current =
        action === "play"
          ? "playing"
          : "paused";


      if (
        position > 0
      ) {

        target.seekTo(
          position,
          true
        );
      }


      window.setTimeout(() => {

        if (
          cancelled
        ) {
          return;
        }

        if (
          action === "play"
        ) {

          target.playVideo();

        } else {

          target.pauseVideo();
        }

      }, 200);

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
              autoplay:
                0,

              controls:
                1,

              playsinline:
                1,

              rel:
                0,

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

                  youtubeReady.current =
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
                    cancelled
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
                  Ignore state generated
                  by remote commands.
                  */

                  if (
                    applyingRemote.current
                  ) {

                    lastPosition.current =
                      position;

                    return;
                  }


                  /*
                  PLAYING
                  */

                  if (
                    event.data === 1
                  ) {

                    if (
                      lastState.current ===
                      "playing"
                    ) {
                      return;
                    }

                    lastState.current =
                      "playing";

                    lastPosition.current =
                      position;

                    controlCallback.current?.(
                      "play",
                      position
                    );

                    return;
                  }


                  /*
                  PAUSED
                  */

                  if (
                    event.data === 2
                  ) {

                    if (
                      lastState.current ===
                      "paused"
                    ) {
                      return;
                    }

                    lastState.current =
                      "paused";

                    lastPosition.current =
                      position;

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


    /*
    YouTube API already loaded
    */

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


    /*
    IMPORTANT:
    props may arrive after player
    */

    if (
      player.current &&
      youtubeReady.current
    ) {

      applyInitialState(
        player.current
      );
    }


    return () => {

      cancelled =
        true;

      youtubeReady.current =
        false;

      clearRemoteTimer();

      if (
        player.current
      ) {

        try {
          player.current.destroy();
        } catch {
          // ignore
        }

        player.current =
          null;
      }

      lastInitialSignature.current =
        null;
    };

  }, [
    youtubeId,
    initialPosition,
    initialAction
  ]);


/*
==================================================
YOUTUBE POSITION MONITOR
==================================================
*/

  useEffect(() => {

    if (!youtubeId) {
      return;
    }


    const timer =
      window.setInterval(() => {

        if (
          !youtubeReady.current ||
          !player.current
        ) {
          return;
        }


        const position =
          clampPosition(
            player.current
              .getCurrentTime()
          );


        const previous =
          lastPosition.current;


        lastPosition.current =
          position;


        /*
        Position callback is for UI.
        */

        positionCallback.current?.(
          position
        );


        /*
        Don't detect seek during
        remote operation.
        */

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
        Normal playback is gradual.
        Large jump = manual seek.
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


/*
==================================================
REMOTE CONTROL
==================================================
*/

  useEffect(() => {

    if (
      !remoteControl
    ) {
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

    const action =
      remoteControl.action ===
      "play"
        ? "play"
        : "pause";


    /*
    YOUTUBE
    */

    if (
      youtubeId &&
      youtubeReady.current &&
      player.current
    ) {

      const target =
        player.current;

      markRemote();

      lastPosition.current =
        position;

      lastState.current =
        action === "play"
          ? "playing"
          : "paused";


      target.seekTo(
        position,
        true
      );


      window.setTimeout(() => {

        if (
          !youtubeReady.current
        ) {
          return;
        }

        if (
          action === "play"
        ) {

          target.playVideo();

        } else {

          target.pauseVideo();
        }

      }, 150);

      return;
    }


    /*
    RUTUBE
    */

    if (
      rutubeId &&
      rutubeReady.current &&
      rutubeIframe.current
    ) {

      const iframe =
        rutubeIframe.current;

      markRemote();

      lastPosition.current =
        position;

      lastState.current =
        action === "play"
          ? "playing"
          : "paused";


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
          !rutubeReady.current ||
          !rutubeIframe.current
        ) {
          return;
        }

        sendRutube(
          rutubeIframe.current,
          action === "play"
            ? "player:play"
            : "player:pause"
        );

      }, 200);


      window.setTimeout(() => {

        if (
          !rutubeReady.current ||
          !rutubeIframe.current
        ) {
          return;
        }

        sendRutube(
          rutubeIframe.current,
          action === "play"
            ? "player:play"
            : "player:pause"
        );

      }, 650);

      return;
    }

  }, [
    remoteControl,
    youtubeId,
    rutubeId
  ]);


/*
==================================================
RUTUBE
==================================================
*/

  useEffect(() => {

    if (!rutubeId) {
      return;
    }


    rutubeReady.current =
      false;

    lastInitialSignature.current =
      null;

    lastPosition.current =
      clampPosition(
        initialPosition
      );


    function applyInitialState() {

      if (
        !rutubeReady.current ||
        !rutubeIframe.current
      ) {
        return;
      }


      const position =
        clampPosition(
          initialPosition
        );

      const action =
        initialAction === "play"
          ? "play"
          : "pause";


      const signature =
        `${position}|${action}`;


      if (
        lastInitialSignature.current ===
        signature
      ) {
        return;
      }


      lastInitialSignature.current =
        signature;


      const iframe =
        rutubeIframe.current;


      markRemote();

      lastPosition.current =
        position;

      lastState.current =
        action === "play"
          ? "playing"
          : "paused";


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
          !rutubeReady.current ||
          !rutubeIframe.current
        ) {
          return;
        }

        sendRutube(
          rutubeIframe.current,
          action === "play"
            ? "player:play"
            : "player:pause"
        );

      }, 250);


      window.setTimeout(() => {

        if (
          !rutubeReady.current ||
          !rutubeIframe.current
        ) {
          return;
        }

        sendRutube(
          rutubeIframe.current,
          action === "play"
            ? "player:play"
            : "player:pause"
        );

      }, 700);
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


      const message =
        parseRutubeMessage(
          event.data
        );


      if (!message) {
        return;
      }


      /*
      READY
      */

      if (
        message.type ===
        "player:ready"
      ) {

        rutubeReady.current =
          true;

        applyInitialState();

        return;
      }


      /*
      CURRENT TIME
      */

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


      /*
      STATE
      */

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
            lastState.current ===
            "playing"
          ) {
            return;
          }

          lastState.current =
            "playing";

          controlCallback.current?.(
            "play",
            position
          );

          return;
        }


        if (
          state === "paused"
        ) {

          if (
            lastState.current ===
            "paused"
          ) {
            return;
          }

          lastState.current =
            "paused";

          controlCallback.current?.(
            "pause",
            position
          );
        }
      }
    }


    window.addEventListener(
      "message",
      handleMessage
    );


    if (
      rutubeReady.current
    ) {
      applyInitialState();
    }


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


/*
==================================================
REMOTE SEEK EVENT
==================================================
*/

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


      /*
      YOUTUBE
      */

      if (
        youtubeId &&
        youtubeReady.current &&
        player.current
      ) {

        markRemote();

        player.current.seekTo(
          position,
          true
        );

        lastPosition.current =
          position;

        return;
      }


      /*
      RUTUBE
      */

      if (
        rutubeId &&
        rutubeReady.current &&
        rutubeIframe.current
      ) {

        markRemote();

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


/*
==================================================
RENDER — YOUTUBE
==================================================
*/

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


/*
==================================================
RENDER — RUTUBE
==================================================
*/

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


/*
==================================================
RENDER — VK
==================================================
*/

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


/*
==================================================
NO VIDEO
==================================================
*/

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
