import { useState } from "react";

type Props = {
  onCreate: (
    videoUrl: string,
    title: string,
    isPublic: boolean,
    category: string
  ) => void;
  onClose?: () => void;
};

type Source = {
  id: string;
  name: string;
  url: string;
};

const sources: Source[] = [
  {
    id: "vk",
    name: "VK ВИДЕО",
    url: "https://vk.com/video"
  },
  {
    id: "youtube",
    name: "YOUTUBE",
    url: "https://www.youtube.com"
  },
  {
    id: "rutube",
    name: "RUTUBE",
    url: "https://rutube.ru"
  },
  {
    id: "kinopoisk",
    name: "КИНОПОИСК",
    url: "https://www.kinopoisk.ru"
  }
];

const categories = [
  { id: "movies", name: "🎬 Фильмы" },
  { id: "series", name: "📺 Сериалы" },
  { id: "music", name: "🎵 Музыка" },
  { id: "gaming", name: "🎮 Gaming" },
  { id: "chill", name: "🌙 Chill" },
  { id: "other", name: "✨ Другое" }
];

function CreateRoom({
  onCreate,
  onClose
}: Props) {

  const [videoUrl, setVideoUrl] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [selectedSource, setSelectedSource] =
    useState("vk");

  const [isPublic, setIsPublic] =
    useState(true);

  const [category, setCategory] =
    useState("movies");

  const activeSource =
    sources.find(
      source =>
        source.id === selectedSource
    );

  function submit() {

    const url =
      videoUrl.trim();

    const roomTitle =
      title.trim();

    if (!url) {
      return;
    }

    onCreate(
      url,
      roomTitle,
      isPublic,
      category
    );
  }

  function openSource() {

    if (!activeSource) {
      return;
    }

    window.open(
      activeSource.url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="modal-backdrop">

      <div className="room-modal create-room-modal">

        <button
          type="button"
          className="modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="modal-label">
          NEW ROOM
        </div>

        <h2>
          Создать комнату
        </h2>

        <p className="modal-description create-room-description">
          Создай комнату и пригласи друзей
          смотреть видео вместе.
        </p>


        {/* PUBLIC / PRIVATE */}

        <div className="room-visibility">

          <button
            type="button"
            className={
              isPublic
                ? "visibility-option active"
                : "visibility-option"
            }
            onClick={() =>
              setIsPublic(true)
            }
          >
            <span className="visibility-icon">
              🌎
            </span>

            <strong>
              PUBLIC
            </strong>
          </button>


          <button
            type="button"
            className={
              !isPublic
                ? "visibility-option active"
                : "visibility-option"
            }
            onClick={() =>
              setIsPublic(false)
            }
          >
            <span className="visibility-icon">
              🔒
            </span>

            <strong>
              PRIVATE
            </strong>
          </button>

        </div>


        {/* PUBLIC OPTIONS */}

        {isPublic && (

          <>
            <div className="video-url-block compact-field category-block">

              <label>
                Категория
              </label>

              <div className="category-select">

                {categories.map(
                  item => (

                    <button
                      key={item.id}
                      type="button"
                      className={
                        category === item.id
                          ? "category-option active"
                          : "category-option"
                      }
                      onClick={() =>
                        setCategory(
                          item.id
                        )
                      }
                    >
                      {item.name}
                    </button>

                  )
                )}

              </div>

            </div>


            <div className="video-url-block compact-field">

              <label>
                Название комнаты
              </label>

              <input
                value={title}
                onChange={event =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Например: Friday Movie Night"
                maxLength={80}
                autoComplete="off"
              />

            </div>
          </>

        )}


        {/* SOURCE */}

        <div className="source-tabs">

          {sources.map(
            source => (

              <button
                key={source.id}
                type="button"
                className={
                  selectedSource === source.id
                    ? "source-tab active"
                    : "source-tab"
                }
                onClick={() =>
                  setSelectedSource(
                    source.id
                  )
                }
              >
                {source.name}
              </button>

            )
          )}

        </div>


        <button
          type="button"
          className="open-source"
          onClick={openSource}
        >
          <span>↗</span>

          Открыть {activeSource?.name}

        </button>


        {/* VIDEO URL */}

        <div className="video-url-block compact-field">

          <label>
            Ссылка на видео
          </label>

          <input
            value={videoUrl}
            onChange={event =>
              setVideoUrl(
                event.target.value
              )
            }
            placeholder="Вставьте ссылку на видео..."
            autoComplete="off"
          />

        </div>


        <button
          type="button"
          className="create-room-button"
          onClick={submit}
        >
          Создать комнату
        </button>

      </div>

    </div>
  );
}

export default CreateRoom;
