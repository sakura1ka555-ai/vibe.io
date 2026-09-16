import { useState } from "react";

import CreateRoom from "./components/CreateRoom";
import RoomCard from "./components/RoomCard";
import WatchRoom from "./components/WatchRoom";

import {
  initTelegram,
  getTelegramUser
} from "./telegram";

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


  const [rooms, setRooms] =
    useState<Room[]>([]);


  const [createOpen, setCreateOpen] =
    useState(false);


  const [joinOpen, setJoinOpen] =
    useState(false);


  const [roomCode, setRoomCode] =
    useState("");


  const [activeRoom, setActiveRoom] =
    useState<Room | null>(null);



  function createRoom(videoUrl: string) {

    const roomId =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();


    const room: Room = {

      id: roomId,

      title: `Комната ${roomId}`,

      users: 1,

      videoUrl

    };


    socket.emit(
      "create-room",
      {
        roomId: room.id,
        title: room.title,
        videoUrl: room.videoUrl
      }
    );


    setRooms(prev => [
      ...prev,
      room
    ]);


    setActiveRoom(room);

    setCreateOpen(false);

  }



  function joinRoom() {

    const code =
      roomCode
        .trim()
        .toUpperCase();


    if (!code) {
      return;
    }


    socket.emit(
      "get-room",
      code,
      (room: Room | null) => {


        if (!room) {

          alert(
            "Комната не найдена"
          );

          return;

        }


        setActiveRoom(room);

        setJoinOpen(false);

        setRoomCode("");

      }
    );

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

          <br />

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

          onClick={() =>
            setJoinOpen(true)
          }

        >

          Войти в комнату

        </button>


      </section>



      {createOpen && (

        <CreateRoom

          onCreate={createRoom}

          onClose={() =>
            setCreateOpen(false)
          }

        />

      )}



      {joinOpen && (

        <div className="modal-backdrop">

          <div className="room-modal">


            <button

              className="modal-close"

              onClick={() =>
                setJoinOpen(false)
              }

            >

              ×

            </button>



            <div className="modal-label">
              JOIN ROOM
            </div>



            <h2>
              Войти в комнату
            </h2>



            <p className="modal-description">

              Введи код комнаты,
              который отправил тебе друг.

            </p>



            <label>
              ID комнаты
            </label>



            <input

              value={roomCode}

              onChange={(e) =>
                setRoomCode(
                  e.target.value
                )
              }

              placeholder="Например K7M4QX"

              maxLength={6}

              autoFocus

            />



            <button

              className="create-room-button"

              onClick={joinRoom}

            >

              Войти

            </button>


          </div>

        </div>

      )}



      {user && (

        <div className="profile">

          {user.first_name}

        </div>

      )}



      {rooms.length > 0 && (

        <section className="rooms">

          <h2>
            Ваши комнаты
          </h2>


          {rooms.map(room => (

            <RoomCard

              key={room.id}

              title={room.title}

              users={room.users}

            />

          ))}

        </section>

      )}


    </main>

  );

}


export default App;
