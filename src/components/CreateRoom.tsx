import { useState } from "react";

type CreateRoomProps = {
  onCreate: (videoUrl: string) => void;
  onClose: () => void;
};

function CreateRoom({
  onCreate,
  onClose
}: CreateRoomProps) {

  const [videoUrl, setVideoUrl] = useState("");
  const [creating, setCreating] = useState(false);

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

  function handleCreate() {
    const url = videoUrl.trim();

    if (!url) {
      alert("Введи ссылку на видео");
      return;
    }

    setCreating(true);

    try {
      onCreate(url);
    } finally {
      setCreating(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter" && !creating) {
      event.preventDefault();
      handleCreate();
    }
  }

  return (
    <div className="modal-backdrop">

      <div className="room-modal">

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

            {videoServices.map((service) => (

              <a
                key={service.name}
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
                className="video-service-button"
              >
                <span className="video-service-name">
                  {service.name}
                </span>

                <span className="video-service-arrow">
                  ↗
                </span>
              </a>

            ))}

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
              setVideoUrl(event.target.value)
            }
            onKeyDown={handleKeyDown}
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
