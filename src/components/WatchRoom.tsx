import { useEffect, useRef, useState } from "react";

import { joinRoom, socket } from "../socket";


type WatchRoomProps = {
  name: string;
  videoUrl: string;
  roomId: string;
};



function WatchRoom({
  name,
  videoUrl,
  roomId
}: WatchRoomProps) {


  const videoRef =
    useRef<HTMLVideoElement>(null);


  const [currentVideo, setCurrentVideo] =
    useState(videoUrl);


  const [users, setUsers] =
    useState(1);





  useEffect(() => {


    joinRoom(roomId);



    socket.on(
      "users",
      (count:number) => {

        setUsers(count);

      }
    );




    socket.on(
      "room-state",
      (room) => {


        if(room.videoUrl) {

          setCurrentVideo(
            room.videoUrl
          );

        }


      }
    );





    socket.on(
      "video-control",
      (data) => {


        const video =
          videoRef.current;


        if(!video) return;



        video.currentTime =
          data.position;



        if(data.action === "play") {

          video.play();

        }



        if(data.action === "pause") {

          video.pause();

        }


      }
    );





    return () => {

      socket.off("users");

      socket.off("room-state");

      socket.off("video-control");

    };


  }, [roomId]);








  function playVideo() {


    const video =
      videoRef.current;


    if(!video) return;



    video.play();




    socket.emit(
      "video-control",
      {

        roomId,

        action:"play",

        position:
          video.currentTime

      }
    );


  }







  function pauseVideo() {


    const video =
      videoRef.current;


    if(!video) return;



    video.pause();




    socket.emit(
      "video-control",
      {

        roomId,

        action:"pause",

        position:
          video.currentTime

      }
    );


  }







  function invite() {


    const link =
    `https://t.me/VIBE_BOT/app?startapp=${roomId}`;



    navigator.clipboard.writeText(
      link
    );



    alert(
      "Ссылка скопирована 💜"
    );


  }







  return (

    <div className="watch-room">


      <h1>
        🎬 {name}
      </h1>




      <video

        ref={videoRef}

        src={currentVideo}

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





      <button onClick={invite}>

        🔗 Пригласить друзей

      </button>




    </div>

  );

}



export default WatchRoom;
