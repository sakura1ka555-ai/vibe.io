import { useEffect, useRef, useState } from "react";
import { joinRoom, socket } from "../socket";


type WatchRoomProps = {
  name: string;
};


function WatchRoom({ name }: WatchRoomProps) {

  const videoRef = useRef<HTMLVideoElement>(null);

  const [users, setUsers] = useState(1);


  const [videoUrl, setVideoUrl] = useState(
    "https://www.w3schools.com/html/mov_bbb.mp4"
  );


  useEffect(() => {

    joinRoom(name);


    socket.on(
      "users",
      (count:number) => {
        setUsers(count);
      }
    );


    // получаем состояние комнаты
    socket.on(
      "room-state",
      (room) => {

        setVideoUrl(
          room.videoUrl
        );


        const video =
          videoRef.current;


        if (!video) return;


        video.currentTime =
          room.position;


        if (room.playing) {

          video.play();

        }

      }
    );



    // команды от других людей
    socket.on(
      "video-control",
      (data) => {


        const video =
          videoRef.current;


        if (!video) return;



        video.currentTime =
          data.position;



        if (
          data.action === "play"
        ) {

          video.play();

        }



        if (
          data.action === "pause"
        ) {

          video.pause();

        }

      }
    );



    return () => {

      socket.off("users");

      socket.off("room-state");

      socket.off("video-control");

    };


  }, [name]);




  function playVideo() {

    const video =
      videoRef.current;


    if (!video) return;


    video.play();


    socket.emit(
      "video-control",
      {

        roomId: name,

        action: "play",

        position:
          video.currentTime

      }
    );

  }





  function pauseVideo() {

    const video =
      videoRef.current;


    if (!video) return;


    video.pause();


    socket.emit(
      "video-control",
      {

        roomId: name,

        action: "pause",

        position:
          video.currentTime

      }
    );

  }




  return (

    <div className="watch-room">


      <h1>
        🎬 {name}
      </h1>



      <video

        ref={videoRef}

        src={videoUrl}

        className="video-player"

        controls

      />



      <div className="members">

        👥 Сейчас смотрят:
        {" "}
        {users}

      </div>



      <button onClick={playVideo}>
        ▶️ Смотреть вместе
      </button>



      <button onClick={pauseVideo}>
        ⏸ Пауза для всех
      </button>


    </div>

  );

}


export default WatchRoom;
