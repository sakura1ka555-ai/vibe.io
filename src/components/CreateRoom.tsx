import { useState } from "react";

type CreateRoomProps = {
  onCreate: (videoUrl: string) => void | Promise<void>;
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


  function openVideoService(
    url: string
  ) {

    try {

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

    } catch (error) {

      console.error(
        "Не удалось открыть сервис:",
        error
      );

    }

  }


  async function handleCreate() {

    const url =
      videoUrl.trim();


    if (!url) {

      alert(
        "Введи ссылку на видео"
      );

      return;

    }


    if (creating) {
      return;
    }


    setCreating(true);


    try {

      await onCreate(url);

    } catch (error) {

      console.error(
        "Create room error:",
        error
      );

    } finally {

      setCreating(false);

    }

  }


  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {

    if (
      event.key === "Enter" &&
      !creating
    ) {

      event.preventDefault();

      void handleCreate();

    }

  }


  return (

    <div
      className="modal-backdrop"
      onClick={(event) => {

        /*
          Закрываем только при клике
          по самому backdrop.

          Клик внутри окна не должен
          всплывать наружу.
        */

        if (
          event.target ===
          event.currentTarget
        ) {

          if (!creating) {
            onClose();
          }

        }

      }}
    >

      <div
        className="room-modal"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >

        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={creating}
        >
          ×
        </button>


        <div className="modal-label">
          CREATE ROOM
        </div>


        <h2>
          Создать комнату
        </h2>


        <p className="modal-description">
          Добавь ссылку на видео,
          чтобы начать совместный просмотр.
        </p>


        {/* =================================
            VIDEO SERVICES
        ================================= */}

        <div className="video-services">

          <div className="video-services-title">
            Где найти фильм?
          </div>


          <div className="video-services-buttons">

            {videoServices.map(
              (service) => (

                <button
                  key={service.name}
                  type="button"
                  className="video-service-button"
                  onClick={() =>
                    openVideoService(
                      service.url
                    )
                  }
                >

                  <span className="video-service-name">
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


        {/* =================================
            VIDEO URL
        ================================= */}

        <div className="video-url-block">

          <label>
            ССЫЛКА НА ВИДЕО
          </label>


          <input
            type="text"
            value={videoUrl}
            onChange={(event) =>
              setVideoUrl(
                event.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            placeholder="Вставь ссылку на фильм или видео"
            autoFocus
            autoComplete="off"
            disabled={creating}
          />

        </div>


        {/* =================================
            CREATE
        ================================= */}

        <button
          type="button"
          className="join-submit-button"
          onClick={() =>
            void handleCreate()
          }
          disabled={
            creating ||
            !videoUrl.trim()
          }
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
