import { useEffect, useRef, useState } from "react";

import Chat from "./Chat";
import { socket, joinRoom } from "../socket";


type Props = {
  name: string;
  videoUrl: string;
  roomId: string;
};



function WatchRoom({
  name,
  videoUrl,
  roomId
}: Props) {


  const videoRef =
    useRef<HTMLVideoElement>(null);


  const [users,setUsers] =
    useState(1);





  useEffect(()=>{


    joinRoom(roomId);



    socket.on(
      "users",
      (count:number)=>{

        setUsers(count);

      }
    );



    socket.on(
      "video-control",
      (data)=>{


        const video =
          videoRef.current;


        if(!video)
          return;



        video.currentTime =
          data.position;



        if(data.action==="play"){

          video.play();

        }



        if(data.action==="pause"){

          video.pause();

        }


      }
    );





    return ()=>{

      socket.off("users");

      socket.off("video-control");

    };


  },[roomId]);








  function control(
    action:string
  ){


    const video =
      videoRef.current;


    if(!video)
      return;



    if(action==="play"){

      video.play();

    }


    if(action==="pause"){

      video.pause();

    }



    socket.emit(
      "video-control",
      {

        roomId,

        action,

        position:
          video.currentTime

      }
    );

  }








  return (

    <div className="watch-room">



      <div className="video-section">


        <div className="room-info">

          <h1>
            🎬 {name}
          </h1>


          <div className="members">

            👥 {users}

          </div>


        </div>





        <video

          ref={videoRef}

          src={videoUrl}

          className="video-player"

          controls

        />





        <button

          onClick={()=>
            control("play")
          }

        >
          ▶ Смотреть вместе
        </button>





        <button

          onClick={()=>
            control("pause")
          }

        >
          ⏸ Пауза
        </button>




      </div>






      <Chat

        roomId={roomId}

      />






    </div>

  );

}


export default WatchRoom;
