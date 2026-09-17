import { useState } from "react";

type CreateRoomProps = {
  onCreate: (videoUrl: string) => void;
  onClose: () => void;
};

function CreateRoom({
  onCreate,
  onClose
}: CreateRoomProps) {

  const [videoUrl, setVideoUrl] =
    useState("");

  const [creating, setCreating] =
    useState(false);


  /*
    =========================
    VIDEO SERVICES
    =========================
  */

  const videoServices = [
    {
      name: "YouTube",
      url: "https://www.youtube.com/"
    },
    {
      name: "RuTube",
      url: "https://rutube.ru/"
    },
    {
      name: "VK Видео",
      url: "https://vkvideo.ru/"
    },
    {
      name: "Кинопоиск",
      url: "https://www.kinopoisk.ru/"
    }
  ];


  /*
    =========================
    OPEN VIDEO SERVICE
    =========================
  */

  function openVideoService(
    url: string
  ) {

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );

  }


  /*
    =========================
    CREATE
    =========================
  */

  function handleCreate() {

    const url =
      videoUrl.trim();


    if (!url) {

      alert(
        "Введи ссылку на видео"
      );

      return;

    }


    setCreating(true);


    try {

      onCreate(url);

    } finally {

      setCreating(false);

    }

  }


  /*
    =========================
    KEYBOARD
    =========================
  */

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {

    if (
      event.key === "Enter" &&
      !creating
    ) {

      event.preventDefault();

      handleCreate();

    }

  }


  /*
    =========================
    RENDER
    =========================
  */

  return (

    <div className="modal-backdrop">

      <div className="room-modal">

        {/* CLOSE */}

        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={creating}
        >
          ×
        </button>


        {/* LABEL */}

        <div className="modal-label">
          CREATE ROOM
        </div>


        {/* TITLE */}

        <h2>
          Создать комнату
        </h2>


        <p className="modal-description">
          Добавь ссылку на видео,
          чтобы начать совместный просмотр.
        </p>


        {/* =========================
            VIDEO SERVICES
        ========================= */}

        <div className="video-services">

          <div className="video-services-title">
            Где найти фильм?
          </div>


          <div className="video-services-buttons">

            {videoServices.map(
              service => (

                <button
                  key={service.name}
                  type="button"
                  className="video-service-button"
                  onClick={() =>
                    openVideoService(
                      service.url
                    )
                  }
                  disabled={creating}
                >

                  <span>
                    {service.name}
                  </span>

                  <span className="video-service-arrow">
                    ↗
                  </span>

                </button>

              )
            )}

          </div>

        </div>


        {/* =========================
            VIDEO URL
        ========================= */}

        <div className="video-url-block">

          <label>
            Ссылка на видео
          </label>


          <input
            type="text"
            value={videoUrl}
            onChange={(event) =>
              setVideoUrl(
                event.target.value
              )
            }
            onKeyDown={handleKeyDown}
            placeholder="Вставь ссылку на фильм или видео"
            autoFocus
            autoComplete="off"
          />

        </div>


        {/* =========================
            CREATE BUTTON
        ========================= */}

        <button
          type="button"
          className="join-submit-button"
          onClick={handleCreate}
          disabled={creating}
        >

          {creating
            ? "Создание..."
            : "Создать комнату"
          }

        </button>

      </div>

    </div>

  );

}


export default CreateRoom;
