import { useState } from "react";

import RoomCard from "./components/RoomCard";
import WatchRoom from "./components/WatchRoom";
import CreateRoom from "./components/CreateRoom";

import { getTelegramUser } from "./telegram";


type Room = {
  title: string;
  users: number;
  videoUrl: string;
};



function App() {


  const user = getTelegramUser();



  const [rooms, setRooms] =
    useState<Room[]>([
      {
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


    const room = {

      title,

      users: 1,

      videoUrl

    };


    setRooms([
      ...rooms,
      room
    ]);


    setActiveRoom(room);


    setShowCreate(false);

  }





  if (activeRoom) {

    return (

      <WatchRoom
        name={activeRoom.title}
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
        showCreate &&
        <CreateRoom
          onCreate={createRoom}
        />
      }



      <h2>
        Активные комнаты
      </h2>




      {
        rooms.map(
          (room,index) => (

            <div
              key={index}
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
