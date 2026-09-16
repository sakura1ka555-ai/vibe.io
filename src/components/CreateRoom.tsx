import { useState } from "react";


type CreateRoomProps = {
  onCreate: (
    title: string,
    videoUrl: string
  ) => void;
};


function CreateRoom({
  onCreate
}: CreateRoomProps) {


  const [title, setTitle] =
    useState("");


  const [videoUrl, setVideoUrl] =
    useState("");



  function submit() {

    if (!title || !videoUrl) return;


    onCreate(
      title,
      videoUrl
    );


  }



  return (

    <div className="room-create">


      <h2>
        🎬 Новая VIBE-комната
      </h2>


      <input

        placeholder="Название фильма"

        value={title}

        onChange={
          e => setTitle(e.target.value)
        }

      />


      <input

        placeholder="Ссылка на видео"

        value={videoUrl}

        onChange={
          e => setVideoUrl(e.target.value)
        }

      />



      <button onClick={submit}>

        Создать комнату

      </button>


    </div>

  );

}


export default CreateRoom;
