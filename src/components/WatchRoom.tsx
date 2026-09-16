import { useEffect, useState } from "react";
import { joinRoom, socket } from "../socket";


type WatchRoomProps = {
  name: string;
};


function WatchRoom({ name }: WatchRoomProps) {

  const [users, setUsers] = useState(1);


  useEffect(() => {

    joinRoom(name);


    socket.on(
      "users",
      (count: number) => {
        setUsers(count);
      }
    );


    return () => {
      socket.off("users");
    };


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
          👥 Сейчас смотрят: {users}
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
