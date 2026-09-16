import { useMemo } from "react";


type Props = {
  videoUrl: string;
};


function getYouTubeId(url: string) {

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
        parts.indexOf("embed");


      if (
        embedIndex !== -1 &&
        parts[embedIndex + 1]
      ) {

        return parts[
          embedIndex + 1
        ];

      }


      const shortsIndex =
        parts.indexOf("shorts");


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


function getRutubeId(url: string) {

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
      videoIndex !== -1 &&
      parts[videoIndex + 1]
    ) {

      return parts[
        videoIndex + 1
      ];

    }


    const privateIndex =
      parts.indexOf("private");


    if (
      privateIndex !== -1 &&
      parts[privateIndex + 1]
    ) {

      return parts[
        privateIndex + 1
      ];

    }


    const embedIndex =
      parts.indexOf("embed");


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


function getVideoType(url: string) {

  const lower =
    url.toLowerCase();


  if (
    lower.includes(
      "youtube.com"
    ) ||
    lower.includes(
      "youtu.be"
    )
  ) {

    return "youtube";

  }


  if (
    lower.includes(
      "rutube.ru"
    )
  ) {

    return "rutube";

  }


  if (
    lower.includes(
      "vk.com"
    ) ||
    lower.includes(
      "vkvideo.ru"
    )
  ) {

    return "vk";

  }


  return "unknown";

}


function VideoPlayer({
  videoUrl
}: Props) {

  const type =
    useMemo(
      () => getVideoType(videoUrl),
      [videoUrl]
    );


  const youtubeId =
    useMemo(
      () => getYouTubeId(videoUrl),
      [videoUrl]
    );


  const rutubeId =
    useMemo(
      () => getRutubeId(videoUrl),
      [videoUrl]
    );


  /*
    YOUTUBE
  */

  if (
    type === "youtube" &&
    youtubeId
  ) {

    return (

      <iframe

        className="embedded-player"

        src={
          `https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&playsinline=1`
        }

        title="YouTube video player"

        allow="
          accelerometer;
          autoplay;
          clipboard-write;
          encrypted-media;
          gyroscope;
          picture-in-picture;
          web-share
        "

        allowFullScreen

      />

    );

  }


  /*
    RUTUBE
  */

  if (
    type === "rutube" &&
    rutubeId
  ) {

    return (

      <iframe

        className="embedded-player"

        src={
          `https://rutube.ru/play/embed/${rutubeId}`
        }

        title="RUTUBE video player"

        allow="
          autoplay;
          clipboard-write
        "

        allowFullScreen

      />

    );

  }


  /*
    VK
  */

  if (type === "vk") {

    return (

      <div className="player-message">

        <div className="player-message-title">
          VK Видео
        </div>

        <div className="player-message-text">

          Для VK нужен специальный
          embed-плеер.

          <br />

          Сейчас подключаем его отдельно.

        </div>

        <a
          href={videoUrl}
          target="_blank"
          rel="noreferrer"
          className="player-open-link"
        >
          Открыть видео в VK →
        </a>

      </div>

    );

  }


  /*
    НЕИЗВЕСТНАЯ ССЫЛКА
  */

  return (

    <div className="player-message">

      <div className="player-message-title">
        Видео не найдено
      </div>

      <div className="player-message-text">

        Проверь ссылку на видео.

        <br />

        Поддерживаются YouTube,
        RUTUBE и VK Видео.

      </div>

    </div>

  );

}


export default VideoPlayer;
