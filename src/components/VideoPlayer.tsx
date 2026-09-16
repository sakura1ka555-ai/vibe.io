import {
  useEffect,
  useMemo,
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


/*
  =========================
  YOUTUBE ID
  =========================
*/

function getYouTubeId(
  url: string
) {

  try {

    const parsed =
      new URL(url);


    if (
      parsed.hostname.includes(
        "youtu.be"
      )
    ) {

      return parsed.pathname
        .replace("/", "")
        .split("/")[0];

    }


    if (
      parsed.hostname.includes(
        "youtube.com"
      )
    ) {

      const id =
        parsed.searchParams.get(
          "v"
        );


      if (id) {
        return id;
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
        embedIndex !== -1 &&
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
        shortsIndex !== -1 &&
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


/*
  =========================
  RUTUBE
  =========================
*/

function getRutubeId(
  url: string
) {

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
      videoIndex !== -1 &&
      parts[videoIndex + 1]
    ) {

      return parts[
        videoIndex + 1
      ];

    }


    const privateIndex =
      parts.indexOf(
        "private"
      );


    if (
      privateIndex !== -1 &&
      parts[privateIndex + 1]
    ) {

      return parts[
        privateIndex + 1
      ];

    }


    const embedIndex =
      parts.indexOf(
        "embed"
      );


    if (
      embedIndex !== -1 &&
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


/*
  =========================
  VK
  =========================
*/

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
  =========================
  YOUTUBE API TYPES
  =========================
*/

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

  data: number;

};


type YouTubeConstructor =
  new (
    element: HTMLElement,
    options: {
      videoId: string;

      playerVars?: Record<
        string,
        number | string
      >;

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
      Player: YouTubeConstructor;
    };

    onYouTubeIframeAPIReady?: () => void;

  }

}


/*
  =========================
  PLAYER
  =========================
*/

function VideoPlayer({
  videoUrl,
  initialPosition = 0,
  initialAction = "pause",
  onControl,
  onPosition,
  remoteControl
}: Props) {

  const youtubeId =
    useMemo(
      () =>
        getYouTubeId(
          videoUrl
        ),
      [videoUrl]
    );


  const rutubeId =
    useMemo(
      () =>
        getRutubeId(
          videoUrl
        ),
      [videoUrl]
    );


  const vkData =
    useMemo(
      () =>
        getVKVideoData(
          videoUrl
        ),
      [videoUrl]
    );


  const playerElement =
    useRef<HTMLDivElement | null>(
      null
    );


  const player =
    useRef<YouTubePlayer | null>(
      null
    );


  const ready =
    useRef(false);


  const remoteAction =
    useRef(false);


  const lastReportedSecond =
    useRef(-1);


  /*
    =========================
    LOAD YOUTUBE API
    =========================
  */

  useEffect(() => {

    if (!youtubeId) {
      return;
    }


    function createPlayer() {

      if (
        !playerElement.current ||
        !window.YT?.Player
      ) {
        return;
      }


      if (player.current) {
        return;
      }


      player.current =
        new window.YT.Player(
          playerElement.current,
          {

            videoId:
              youtubeId,

            playerVars: {

              autoplay: 0,

              controls: 1,

              playsinline: 1,

              enablejsapi: 1,

              origin:
                window.location.origin

            },

            events: {

              onReady: (
                event
              ) => {

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


                if (
                  initialAction ===
                  "play"
                ) {

                  event.target.playVideo();

                }

              },


              onStateChange: (
                event
              ) => {

                if (
                  remoteAction.current
                ) {

                  return;

                }


                const position =
                  event.target
                    .getCurrentTime();


                if (
                  event.data === 1
                ) {

                  onControl?.(
                    "play",
                    position
                  );

                }


                if (
                  event.data === 2
                ) {

                  onControl?.(
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
      API уже загружен
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


      const existing =
        document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]'
        );


      if (!existing) {

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
    youtubeId,
    initialPosition,
    initialAction,
    onControl
  ]);


  /*
    =========================
    REPORT POSITION
    =========================
  */

  useEffect(() => {

    if (!youtubeId) {
      return;
    }


    const interval =
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


          const second =
            Math.floor(
              position
            );


          if (
            second ===
            lastReportedSecond.current
          ) {
            return;
          }


          lastReportedSecond.current =
            second;


          onPosition?.(
            position
          );

        },
        1000
      );


    return () => {

      window.clearInterval(
        interval
      );

    };

  }, [
    youtubeId,
    onPosition
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


    remoteAction.current =
      true;


    player.current.seekTo(
      remoteControl.position,
      true
    );


    if (
      remoteControl.action ===
      "play"
    ) {

      player.current.playVideo();

    } else {

      player.current.pauseVideo();

    }


    window.setTimeout(
      () => {

        remoteAction.current =
          false;

      },
      500
    );

  }, [
    remoteControl
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
          playerElement
        }
        className="embedded-player"
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
