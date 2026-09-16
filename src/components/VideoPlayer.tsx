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
        .replace(
          /^www\./,
          ""
        );


    if (
      host === "youtu.be"
    ) {

      return parsed.pathname
        .split("/")
        .filter(Boolean)[0]
        || null;

    }


    if (
      host === "youtube.com" ||
      host === "m.youtube.com"
    ) {

      const videoId =
        parsed.searchParams.get(
          "v"
        );


      if (videoId) {

        return videoId;

      }


      const parts =
        parsed.pathname
          .split("/")
          .filter(Boolean);


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


      const shortsIndex =
        parts.indexOf(
          "shorts"
        );


      if (
        shortsIndex >= 0 &&
        parts[shortsIndex + 1]
      ) {

        return parts[
          shortsIndex + 1
        ];

      }

    }

  } catch {

    return null;

  }


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
   PLAYER
================================= */

function VideoPlayer({
  videoUrl,
  initialPosition = 0,
  initialAction = "pause",
  onControl,
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
    TRUE only while we are
    applying a remote command.
  */

  const applyingRemote =
    useRef(false);


  const lastRemoteId =
    useRef<number | null>(
      null
    );


  /*
    Current Rutube position.

    This is updated from
    player:currentTime.
  */

  const rutubeLastTime =
    useRef<number>(
      0
    );


  /*
    Current Rutube state.
  */

  const rutubeState =
    useRef<
      "play" | "pause"
    >(
      "pause"
    );


  /*
    Prevent duplicate local
    play/pause events.
  */

  const lastSentAction =
    useRef<
      "play" | "pause" | null
    >(
      null
    );


  /*
    Timestamp of last local
    control event.
  */

  const lastControlTime =
    useRef<number>(
      0
    );


  const positionCallback =
    useRef(onPosition);


  const controlCallback =
    useRef(onControl);


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


  /* =================================
     CALLBACKS
  ================================= */

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


  /* =================================
     YOUTUBE
     UNCHANGED
  ================================= */

  useEffect(() => {

    if (!youtubeId) {

      return;

    }


    let cancelled =
      false;


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

              onReady: (
                event
              ) => {

                if (cancelled) {

                  return;

                }


                ready.current =
                  true;


                if (
                  initialPosition > 0
                ) {

                  event.target.seekTo(
                    initialPosition,
                    true
                  );

                }

              },


              onStateChange: (
                event
              ) => {

                if (
                  applyingRemote.current
                ) {

                  return;

                }


                if (
                  !event.target
                ) {

                  return;

                }


                const position =
                  event.target
                    .getCurrentTime();


                if (
                  event.data === 1
                ) {

                  controlCallback.current?.(
                    "play",
                    position
                  );

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


    rutubeState.current =
      initialAction;


    lastSentAction.current =
      null;


    /*
      Send command to Rutube.

      IMPORTANT:
      Rutube requires commands
      after player:ready.
    */

    function sendRutubeCommand(
      type: string,
      data: Record<string, unknown> = {}
    ) {

      if (
        !rutubeIframe.current ||
        !rutubeReady.current
      ) {

        return;

      }


      rutubeIframe.current
        .contentWindow
        ?.postMessage(
          JSON.stringify({

            type,

            data

          }),
          "https://rutube.ru"
        );

    }


    /*
      Apply a remote command.

      We intentionally send the
      position BEFORE play/pause.
    */

    function applyRutubeRemote(
      action:
        "play" | "pause",
      position: number
    ) {

      if (
        !rutubeReady.current
      ) {

        return;

      }


      applyingRemote.current =
        true;


      const safePosition =
        Number.isFinite(position)
          ? Math.max(
              0,
              position
            )
          : 0;


      rutubeLastTime.current =
        safePosition;


      /*
        1. Move to exact position.
      */

      sendRutubeCommand(
        "player:setCurrentTime",
        {
          time:
            safePosition
        }
      );


      /*
        2. Apply state shortly
           afterwards.
      */

      window.setTimeout(
        () => {

          if (
            action === "play"
          ) {

            sendRutubeCommand(
              "player:play"
            );

          } else {

            sendRutubeCommand(
              "player:pause"
            );

          }

        },
        120
      );


      /*
        3. Repeat the command.

        This helps when the Rutube
        iframe is buffering or hasn't
        processed the first message.
      */

      window.setTimeout(
        () => {

          if (
            action === "play"
          ) {

            sendRutubeCommand(
              "player:play"
            );

          } else {

            sendRutubeCommand(
              "player:pause"
            );

          }

        },
        350
      );


      /*
        4. Final position correction.

        This prevents the second
        device from staying at its
        old timestamp.
      */

      window.setTimeout(
        () => {

          sendRutubeCommand(
            "player:setCurrentTime",
            {
              time:
                safePosition
            }
          );

        },
        500
      );


      /*
        Release remote lock.

        Long enough to ignore
        Rutube's own events caused
        by our command.
      */

      window.setTimeout(
        () => {

          applyingRemote.current =
            false;

        },
        1000
      );

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
        RutubeMessage;


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


      /* =================================
         RUTUBE READY
      ================================= */

      if (
        message.type ===
        "player:ready"
      ) {

        rutubeReady.current =
          true;


        /*
          Set initial position.
        */

        if (
          initialPosition > 0
        ) {

          sendRutubeCommand(
            "player:setCurrentTime",
            {
              time:
                initialPosition
            }
          );

        }


        /*
          If room says PLAY,
          start automatically.

          Repeat because the first
          command can occasionally
          be ignored while loading.
        */

        if (
          initialAction ===
          "play"
        ) {

          window.setTimeout(
            () => {

              sendRutubeCommand(
                "player:play"
              );

            },
            100
          );


          window.setTimeout(
            () => {

              sendRutubeCommand(
                "player:play"
              );

            },
            400
          );

        }


        return;

      }


      /* =================================
         CURRENT TIME
      ================================= */

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
          rutubeLastTime.current;


        rutubeLastTime.current =
          time;


        /*
          Always expose current
          position to the room.
        */

        positionCallback.current?.(
          time
        );


        /*
          Don't create control events
          from our own remote commands.
        */

        if (
          applyingRemote.current
        ) {

          return;

        }


        /*
          Detect manual seek.

          Normal playback changes
          slowly.

          A jump > 2.5 seconds
          is treated as a seek.
        */

        if (
          previous !== null &&
          Math.abs(
            time - previous
          ) > 2.5
        ) {

          const now =
            Date.now();


          /*
            Avoid duplicate seek
            events firing too quickly.
          */

          if (
            now -
              lastControlTime.current
            >
            300
          ) {

            lastControlTime.current =
              now;


            controlCallback.current?.(
              rutubeState.current,
              time
            );

          }

        }


        return;

      }


      /* =================================
         STATE CHANGE
      ================================= */

      if (
        message.type ===
        "player:changeState"
      ) {

        const state =
          message.data?.state;


        /*
          Ignore events generated
          by our remote command.
        */

        if (
          applyingRemote.current
        ) {

          return;

        }


        /*
          PLAYING
        */

        if (
          state ===
          "playing"
        ) {

          rutubeState.current =
            "play";


          /*
            Don't spam identical
            play events.
          */

          if (
            lastSentAction.current !==
            "play"
          ) {

            lastSentAction.current =
              "play";


            lastControlTime.current =
              Date.now();


            controlCallback.current?.(
              "play",
              rutubeLastTime.current
            );

          }


          return;

        }


        /*
          PAUSED
        */

        if (
          state ===
          "paused"
        ) {

          rutubeState.current =
            "pause";


          /*
            IMPORTANT:

            rutubeLastTime is the latest
            position received from
            player:currentTime.

            So pause sends the real
            current timestamp instead
            of an old room timestamp.
          */

          const pausePosition =
            rutubeLastTime.current;


          lastSentAction.current =
            "pause";


          lastControlTime.current =
            Date.now();


          controlCallback.current?.(
            "pause",
            pausePosition
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
    initialPosition,
    initialAction
  ]);


  /* =================================
     YOUTUBE INITIAL STATE
  ================================= */

  useEffect(() => {

    if (
      !ready.current ||
      !player.current
    ) {

      return;

    }


    if (
      initialPosition > 0
    ) {

      player.current.seekTo(
        initialPosition,
        true
      );

    }

  }, [
    initialPosition,
    initialAction
  ]);


  /* =================================
     REMOTE CONTROL
  ================================= */

  useEffect(() => {

    if (
      !remoteControl
    ) {

      return;

    }


    /*
      Ignore the same event.
    */

    if (
      lastRemoteId.current ===
      remoteControl.id
    ) {

      return;

    }


    lastRemoteId.current =
      remoteControl.id;


    /* =================================
       YOUTUBE
    ================================= */

    if (
      youtubeId &&
      ready.current &&
      player.current
    ) {

      applyingRemote.current =
        true;


      const target =
        player.current;


      target.seekTo(
        remoteControl.position,
        true
      );


      if (
        remoteControl.action ===
        "play"
      ) {

        target.playVideo();

      } else {

        target.pauseVideo();

      }


      window.setTimeout(
        () => {

          applyingRemote.current =
            false;

        },
        800
      );


      return;

    }


    /* =================================
       RUTUBE
    ================================= */

    if (
      rutubeId &&
      rutubeReady.current
    ) {

      /*
        applyRutubeRemote already
        handles:

        position
        pause/play
        retry
        final position correction
      */

      const iframe =
        rutubeIframe.current;


      if (!iframe) {

        applyingRemote.current =
          false;

        return;

      }


      applyingRemote.current =
        true;


      const safePosition =
        Math.max(
          0,
          Number(
            remoteControl.position
          ) || 0
        );


      rutubeLastTime.current =
        safePosition;


      /*
        First seek.
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
        Then PLAY/PAUSE.
      */

      window.setTimeout(
        () => {

          iframe.contentWindow?.postMessage(

            JSON.stringify({

              type:
                remoteControl.action ===
                "play"

                  ? "player:play"

                  : "player:pause",

              data: {}

            }),

            "https://rutube.ru"

          );

        },
        120
      );


      /*
        Retry PLAY/PAUSE.
      */

      window.setTimeout(
        () => {

          iframe.contentWindow?.postMessage(

            JSON.stringify({

              type:
                remoteControl.action ===
                "play"

                  ? "player:play"

                  : "player:pause",

              data: {}

            }),

            "https://rutube.ru"

          );

        },
        350
      );


      /*
        Final position correction.
      */

      window.setTimeout(
        () => {

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

        },
        500
      );


      /*
        Unlock after all remote
        events have settled.
      */

      window.setTimeout(
        () => {

          applyingRemote.current =
            false;

        },
        1000
      );


      return;

    }


    /*
      Player isn't ready yet.
    */

    window.setTimeout(
      () => {

        applyingRemote.current =
          false;

      },
      1000
    );

  }, [
    remoteControl,
    youtubeId,
    rutubeId
  ]);


  /* =================================
     YOUTUBE POSITION
  ================================= */

  useEffect(() => {

    if (!youtubeId) {

      return;

    }


    const timer =
      window.setInterval(
        () => {

          if (
            !ready.current ||
            !player.current
          ) {

            return;

          }


          const position =
            player.current
              .getCurrentTime();


          positionCallback.current?.(
            position
          );

        },
        1000
      );


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
        ref={
          playerContainer
        }
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
