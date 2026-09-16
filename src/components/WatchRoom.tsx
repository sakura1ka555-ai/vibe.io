import { useEffect } from "react";
import { joinRoom } from "../socket";


type WatchRoomProps = {
  name: string;
};


function WatchRoom({ name }: WatchRoomProps) {

  useEffect(() => {

    joinRoom(name);

  }, [name]);


  return (
    <div className="watch-room">

      <h1>
        🎬 {name}
      </h1>


      <div className="video-box">
        Видео появится здесь
      </div>


      <div className="members">

        <h3>
          Участники
        </h3>

        <p>
          👤 Ты
        </p>

      </div>


      <div className="chat-box">
        💬 Чат комнаты
      </div>


      <button>
        🔗 Пригласить друзей
      </button>


    </div>
  );
}


export default WatchRoom;
