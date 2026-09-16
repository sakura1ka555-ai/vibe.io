import { useMemo } from "react";


type Props = {
  videoUrl: string;
};


/*
  =========================
  YOUTUBE
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
  VK VIDEO
  =========================
*/

function getVKVideoData(
  url: string
) {

  try {

    const parsed =
      new URL(url);


    /*
      Готовая VK embed-ссылка
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
      Обычная ссылка:

      /video-79337779_456243692
    */

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

  } catch {

    return null;

  }

}


/*
  =========================
  VIDEO TYPE
  =========================
*/

function getVideoType(
  url: string
) {

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
      "vkvideo.ru"
    ) ||
    lower.includes(
      "vk.com"
    ) ||
    lower.includes(
      "vk.ru"
    )
  ) {

    return "vk";

  }


  return "unknown";

}


/*
  =========================
  PLAYER
  =========================
*/

function VideoPlayer({
  videoUrl
}: Props) {

  const type =
    useMemo(
      () =>
        getVideoType(
          videoUrl
        ),
      [videoUrl]
    );


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


  /*
    =========================
    YOUTUBE
    =========================
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

        title="YouTube"

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
    =========================
    RUTUBE
    =========================
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
    VK VIDEO
    =========================
  */

  if (
    type === "vk" &&
    vkData
  ) {

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
