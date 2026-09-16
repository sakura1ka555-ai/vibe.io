import { useState } from "react";

import CreateRoom from "./components/CreateRoom";
import RoomCard from "./components/RoomCard";
import WatchRoom from "./components/WatchRoom";

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



  const [rooms, setRooms] = useState<Room[]>([]);


  const [createOpen, setCreateOpen] =
    useState(false);


  const [activeRoom, setActiveRoom] =
    useState<Room | null>(null);





  function createRoom(
    title:string,
    videoUrl:string
  ) {


    const room:Room = {

      id: crypto.randomUUID(),

      title,

      users:1,

      videoUrl

    };



    socket.emit(
      "create-room",
      {
        roomId:room.id,
        title:room.title,
        videoUrl:room.videoUrl
      }
    );



    setRooms([
      ...rooms,
      room
    ]);



    setActiveRoom(room);


  }





  if(activeRoom){

    return (

      <WatchRoom

        name={activeRoom.title}

        videoUrl={activeRoom.videoUrl}

        roomId={activeRoom.id}

      />

    );

  }







  return (

    <main className="home">


      <div className="brand">


        <div className="logo">
          VIBE
        </div>



        <div className="status">

          ● ONLINE

        </div>


      </div>





      <section className="hero">


        <h1>

          Смотри вместе.

          <br/>

          Чувствуй момент.

        </h1>



        <p>

          Совместный просмотр
          фильмов с друзьями
          где бы вы ни были.

        </p>



      </section>







      <section className="actions">


        <button

          className="primary"

          onClick={() =>
            setCreateOpen(true)
          }

        >

          + Создать комнату

        </button>




        <button

          className="secondary"

        >

          Войти по ссылке

        </button>


      </section>






      {
        createOpen &&

        <CreateRoom

          onCreate={createRoom}

        />

      }







      {
        user &&

        <div className="profile">

          {user.first_name}

        </div>

      }







      {
        rooms.length > 0 &&

        <section className="rooms">


          <h2>
            Комнаты
          </h2>



          {
            rooms.map(
              room => (

                <RoomCard

                  key={room.id}

                  title={room.title}

                  users={room.users}

                />

              )
            )
          }


        </section>

      }






    </main>

  );

}


export default App;
