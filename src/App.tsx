import { useState } from "react";

import RoomCard from "./components/RoomCard";
import WatchRoom from "./components/WatchRoom";
import CreateRoom from "./components/CreateRoom";

import { initTelegram, getTelegramUser } from "./telegram";
import { socket } from "./socket";


type Room = {
  id: string;
  title: string;
  users: number;
  videoUrl: string;
};



function App() {

  initTelegram();

  const user = getTelegramUser();



  const [rooms, setRooms] = useState<Room[]>([
    {
      id: crypto.randomUUID(),
      title: "Вечерний фильм 🎬",
      users: 3,
      videoUrl:
        "https://www.w3schools.com/html/mov_bbb.mp4"
    }
  ]);



  const [showCreate, setShowCreate] =
    useState(false);



  const [activeRoom, setActiveRoom] =
    useState<Room | null>(null);




  function createRoom(
    title: string,
    videoUrl: string
  ) {


    const newRoom: Room = {

      id: crypto.randomUUID(),

      title,

      users: 1,

      videoUrl

    };



    socket.emit(
      "create-room",
      {
        roomId: newRoom.id,
        title: newRoom.title,
        videoUrl: newRoom.videoUrl
      }
    );



    setRooms([
      ...rooms,
      newRoom
    ]);



    setActiveRoom(newRoom);



    setShowCreate(false);

  }






  if (activeRoom) {

    return (

      <WatchRoom

        name={activeRoom.title}

        videoUrl={activeRoom.videoUrl}

        roomId={activeRoom.id}

      />

    );

  }







  return (

    <div className="app">


      <div className="logo">
        VIBE
      </div>




      <h1>
        Привет, {user?.first_name || "друг"} 👋
      </h1>




      <p>
        Смотри фильмы вместе
        с друзьями онлайн
      </p>




      <button

        onClick={() =>
          setShowCreate(true)
        }

      >
        + Создать комнату
      </button>





      {
        showCreate && (

          <CreateRoom

            onCreate={createRoom}

          />

        )
      }







      <h2>
        Активные комнаты
      </h2>







      {
        rooms.map(
          (room) => (

            <div

              key={room.id}

              onClick={() =>
                setActiveRoom(room)
              }

            >

              <RoomCard

                title={room.title}

                users={room.users}

              />


            </div>

          )
        )
      }






    </div>

  );

}



export default App;
