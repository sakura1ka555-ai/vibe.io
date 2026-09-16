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


/* =================================
   VK TYPES
================================= */

type VKPlayerState = {

  state?: string;

  volume?: number;

  muted?: boolean;

  time?: number;

  duration?: number;

};


type VKVideoPlayer = {

  play: () => void;

  pause: () => void;

  seek: (
    time: number
  ) => void;

  getCurrentTime: () => number;

  getDuration?: () => number;

  getState?: () => string;

  on: (
    event: string,
    listener: (
      state?: VKPlayerState
    ) => void
  ) => void;

  off?: (
    event: string,
    listener: (
      state?: VKPlayerState
    ) => void
  ) => void;

  destroy: () => void;

};


type VKVideoPlayerConstructor = (
  iframe: HTMLIFrameElement
) => VKVideoPlayer;


declare global {

  interface Window {

    YT?: {
      Player: YouTubePlayerConstructor;
    };

    onYouTubeIframeAPIReady?: () => void;


    VK?: {

      VideoPlayer:
        VKVideoPlayerConstructor;

    };

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


    /*
      Already an embed URL
    */

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


    /*
      VK Video:

      https://vkvideo.ru/video-123_456

      https://vk.com/video-123_456
    */

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

  /*
    =========================
    COMMON REFS
    =========================
  */

  const youtubeContainer =
    useRef<HTMLDivElement | null>(
      null
    );


  const youtubePlayer =
    useRef<YouTubePlayer | null>(
      null
    );


  const vkIframe =
    useRef<HTMLIFrameElement | null>(
      null
    );


  const vkPlayer =
    useRef<VKVideoPlayer | null>(
      null
    );


  const ready =
    useRef(false);


  const applyingRemote =
    useRef(false);


  const lastRemoteId =
    useRef<number | null>(
      null
    );


  const positionCallback =
    useRef(onPosition);


  const controlCallback =
    useRef(onControl);


  /*
    =========================
    DETECT SOURCE
    =========================
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
    =========================
    CALLBACKS
    =========================
  */

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


  /*
    =========================
    YOUTUBE
    =========================
  */

  useEffect(() => {

    if (!youtubeId) {

      return;

    }


    let cancelled =
      false;


    function createYouTubePlayer() {

      if (
        cancelled ||
        !youtubeContainer.current ||
        !window.YT?.Player ||
        youtubePlayer.current
      ) {

        return;

      }


      youtubePlayer.current =
        new window.YT.Player(
          youtubeContainer.current,
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

      createYouTubePlayer();

    } else {

      const previous =
        window.onYouTubeIframeAPIReady;


      window.onYouTubeIframeAPIReady =
        () => {

          previous?.();

          createYouTubePlayer();

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
        youtubePlayer.current
      ) {

        youtubePlayer.current.destroy();

        youtubePlayer.current =
          null;

      }

    };

  }, [
    youtubeId
  ]);


  /*
    =========================
    VK API
    =========================
  */

  useEffect(() => {

    if (
      !vkData
    ) {

      return;

    }


    let cancelled =
      false;


    function connectVK() {

      if (
        cancelled ||
        !vkIframe.current ||
        !window.VK?.VideoPlayer ||
        vkPlayer.current
      ) {

        return;

      }


      try {

        const player =
          window.VK.VideoPlayer(
            vkIframe.current
          );


        vkPlayer.current =
          player;


        ready.current =
          true;


        /*
          VIDEO INITIALIZED
        */

        const handleInited = (
          state?: VKPlayerState
        ) => {

          if (
            cancelled ||
            !vkPlayer.current
          ) {

            return;

          }


          ready.current =
            true;


          const position =
            Number(
              state?.time ??
              initialPosition ??
              0
            );


          if (
            position > 0
          ) {

            try {

              vkPlayer.current.seek(
                position
              );

            } catch {

              /* ignore */

            }

          }

        };


        /*
          PLAY
        */

        const handleStarted = (
          state?: VKPlayerState
        ) => {

          if (
            applyingRemote.current
          ) {

            return;

          }


          const position =
            Number(
              state?.time ??
              vkPlayer.current?.getCurrentTime() ??
              0
            );


          controlCallback.current?.(
            "play",
            position
          );

        };


        /*
          RESUME
        */

        const handleResumed = (
          state?: VKPlayerState
        ) => {

          if (
            applyingRemote.current
          ) {

            return;

          }


          const position =
            Number(
              state?.time ??
              vkPlayer.current?.getCurrentTime() ??
              0
            );


          controlCallback.current?.(
            "play",
            position
          );

        };


        /*
          PAUSE
        */

        const handlePaused = (
          state?: VKPlayerState
        ) => {

          if (
            applyingRemote.current
          ) {

            return;

          }


          const position =
            Number(
              state?.time ??
              vkPlayer.current?.getCurrentTime() ??
              0
            );


          controlCallback.current?.(
            "pause",
            position
          );

        };


        /*
          TIME UPDATE
        */

        const handleTimeUpdate = (
          state?: VKPlayerState
        ) => {

          if (
            applyingRemote.current
          ) {

            return;

          }


          const position =
            Number(
              state?.time ??
              vkPlayer.current?.getCurrentTime() ??
              0
            );


          positionCallback.current?.(
            position
          );

        };


        player.on(
          "inited",
          handleInited
        );


        player.on(
          "started",
          handleStarted
        );


        player.on(
          "resumed",
          handleResumed
        );


        player.on(
          "paused",
          handlePaused
        );


        player.on(
          "timeupdate",
          handleTimeUpdate
        );


      } catch (
        error
      ) {

        console.error(
          "VK Video API error:",
          error
        );

      }

    }


    /*
      Load VK API
    */

    if (
      window.VK?.VideoPlayer
    ) {

      connectVK();

    } else {

      const existingScript =
        document.querySelector(
          'script[src="https://vk.com/js/api/videoplayer.js"]'
        );


      if (
        existingScript
      ) {

        existingScript.addEventListener(
          "load",
          connectVK,
          {
            once: true
          }
        );

      } else {

        const script =
          document.createElement(
            "script"
          );


        script.src =
          "https://vk.com/js/api/videoplayer.js";


        script.async =
          true;


        script.onload =
          connectVK;


        script.onerror =
          () => {

            console.error(
              "VK Video API failed to load"
            );

          };


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
        vkPlayer.current
      ) {

        try {

          vkPlayer.current.destroy();

        } catch {

          /* ignore */

        }


        vkPlayer.current =
          null;

      }

    };

  }, [
    vkData?.oid,
    vkData?.id,
    vkData?.hash
  ]);


  /*
    =========================
    CURRENT POSITION
    =========================
  */

  useEffect(() => {

    if (
      !youtubeId &&
      !vkData
    ) {

      return;

    }


    const timer =
      window.setInterval(
        () => {

          /*
            YOUTUBE
          */

          if (
            youtubeId &&
            ready.current &&
            youtubePlayer.current
          ) {

            try {

              const position =
                youtubePlayer.current
                  .getCurrentTime();


              positionCallback.current?.(
                position
              );

            } catch {

              /* ignore */

            }

          }


          /*
            VK
          */

          if (
            vkData &&
            ready.current &&
            vkPlayer.current
          ) {

            try {

              const position =
                vkPlayer.current
                  .getCurrentTime();


              positionCallback.current?.(
                position
              );

            } catch {

              /* ignore */

            }

          }

        },
        1000
      );


    return () => {

      window.clearInterval(
        timer
      );

    };

  }, [
    youtubeId,
    vkData
  ]);


  /*
    =========================
    REMOTE CONTROL
    =========================
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


    /*
      YOUTUBE
    */

    if (
      youtubeId &&
      ready.current &&
      youtubePlayer.current
    ) {

      applyingRemote.current =
        true;


      const target =
        youtubePlayer.current;


      try {

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

      } catch {

        /* ignore */

      }


      window.setTimeout(
        () => {

          applyingRemote.current =
            false;

        },
        1000
      );

    }


    /*
      VK
    */

    if (
      vkData &&
      ready.current &&
      vkPlayer.current
    ) {

      applyingRemote.current =
        true;


      const target =
        vkPlayer.current;


      try {

        target.seek(
          remoteControl.position
        );


        if (
          remoteControl.action ===
          "play"
        ) {

          target.play();

        } else {

          target.pause();

        }

      } catch {

        /* ignore */

      }


      window.setTimeout(
        () => {

          applyingRemote.current =
            false;

        },
        1000
      );

    }

  }, [
    remoteControl,
    youtubeId,
    vkData
  ]);


  /*
    =========================
    YOUTUBE VIEW
    =========================
  */

  if (youtubeId) {

    return (

      <div
        ref={
          youtubeContainer
        }
        className="youtube-player"
      />

    );

  }


  /*
    =========================
    RUTUBE VIEW
    =========================
  */

  if (rutubeId) {

    return (

      <iframe
        className="embedded-player"

        src={
          `https://rutube.ru/play/embed/${rutubeId}`
        }

        title="RUTUBE"

        allow="
          autoplay;
          encrypted-media;
          fullscreen;
          picture-in-picture
        "

        allowFullScreen
      />

    );

  }


  /*
    =========================
    VK VIEW
    =========================
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


    /*
      VERY IMPORTANT:
      Enable VK JavaScript API.
    */

    params.set(
      "js_api",
      "1"
    );


    return (

      <iframe

        ref={
          vkIframe
        }

        className="embedded-player"

        src={
          `https://vkvideo.ru/video_ext.php?${params.toString()}`
        }

        title="VK Video"

        allow="
          autoplay;
          encrypted-media;
          fullscreen;
          picture-in-picture;
          screen-wake-lock
        "

        frameBorder="0"

        allowFullScreen

      />

    );

  }


  /*
    =========================
    ERROR
    =========================
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
