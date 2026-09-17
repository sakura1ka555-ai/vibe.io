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
            placeholder="Например https://..."
            autoFocus
            autoComplete="off"
          />

        </div>


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
