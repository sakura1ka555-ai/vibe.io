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
   TYPES
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


    /*
      youtu.be/VIDEO_ID
    */

    if (
      host === "youtu.be"
    ) {

      return parsed.pathname
        .split("/")
        .filter(Boolean)[0]
        || null;

    }


    /*
      youtube.com/watch?v=VIDEO_ID
    */

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


      /*
        youtube.com/embed/VIDEO_ID
      */

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


      /*
        youtube.com/shorts/VIDEO_ID
      */

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


  const player =
    useRef<YouTubePlayer | null>(
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
    Keep callbacks current
    without recreating player
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
    LOAD YOUTUBE API
    =========================
  */

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


                /*
                  Put new viewer at
                  current room position.
                */

                if (
                  initialPosition > 0
                ) {

                  event.target.seekTo(
                    initialPosition,
                    true
                  );

                }


                /*
                  Do NOT autoplay
                  automatically.

                  Browser autoplay
                  restrictions can block it.
                */

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


                /*
                  1 = PLAYING
                */

                if (
                  event.data === 1
                ) {

                  controlCallback.current?.(
                    "play",
                    position
                  );

                }


                /*
                  2 = PAUSED
                */

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


    /*
      API already loaded
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


  /*
    =========================
    INITIAL STATE
    =========================
  */

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


    /*
      We intentionally don't
      autoplay here.

      User must press play once.
    */

  }, [
    initialPosition,
    initialAction
  ]);


  /*
    =========================
    REMOTE CONTROL
    =========================
  */

  useEffect(() => {

    if (
      !remoteControl ||
      !ready.current ||
      !player.current
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

  }, [
    remoteControl
  ]);


  /*
    =========================
    CURRENT POSITION
    =========================
  */

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


  /*
    =========================
    YOUTUBE
    =========================
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
    =========================
    RUTUBE
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
    VK
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
