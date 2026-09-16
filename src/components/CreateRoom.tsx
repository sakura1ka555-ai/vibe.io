import { useState } from "react";


type Props = {
  onCreate:
  (
    title:string,
    videoUrl:string
  ) => void;
};



function CreateRoom({
  onCreate
}:Props) {


  const [title,setTitle] =
    useState("");


  const [videoUrl,setVideoUrl] =
    useState("");



  return (

    <div className="room-create">


      <input

        placeholder="Название комнаты"

        value={title}

        onChange={
          e=>setTitle(e.target.value)
        }

      />



      <input

        placeholder="Ссылка на видео"

        value={videoUrl}

        onChange={
          e=>setVideoUrl(e.target.value)
        }

      />



      <button

        onClick={() =>
          onCreate(
            title,
            videoUrl
          )
        }

      >

        Создать

      </button>


    </div>

  );

}


export default CreateRoom;
