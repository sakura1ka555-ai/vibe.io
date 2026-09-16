import { useState } from "react";

type Props = {
  onCreate: (videoUrl: string) => void;
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


function CreateRoom({
  onCreate,
  onClose
}: Props) {

  const [videoUrl, setVideoUrl] =
    useState("");

  const [selectedSource, setSelectedSource] =
    useState("vk");


  const activeSource =
    sources.find(
      source => source.id === selectedSource
    );


  function submit() {

    const url =
      videoUrl.trim();


    if (!url) {
      return;
    }


    onCreate(url);

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

      <div className="room-modal">


        <button
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


        <p className="modal-description">

          Выбери видеосервис,
          найди видео и вставь его ссылку.

        </p>


        <div className="source-tabs">

          {sources.map(source => (

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

          ))}

        </div>


        <button

          type="button"

          className="open-source"

          onClick={openSource}

        >

          <span>
            ↗
          </span>

          Открыть {activeSource?.name}

        </button>


        <div className="video-url-block">

          <label>
            Ссылка на видео
          </label>


          <input

            value={videoUrl}

            onChange={(e) =>
              setVideoUrl(
                e.target.value
              )
            }

            placeholder={
              "Вставьте ссылку на видео..."
            }

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
