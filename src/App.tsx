import {
  useEffect,
  useState
} from "react";

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

  const user =
    getTelegramUser();


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

  const [joining, setJoining] =
    useState(false);


  /*
    =========================
    CREATE ROOM
    =========================
  */

  function createRoom(
    videoUrl: string
  ) {

    const roomId =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();


    const room: Room = {

      id: roomId,

      title:
        `Комната ${roomId}`,

      users: 0,

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


    setRooms(
      previous => [
        ...previous,
        room
      ]
    );


    setCreateOpen(false);

    setActiveRoom(room);

  }


  /*
    =========================
    JOIN ROOM
    =========================
  */

  function joinRoom() {

    const code =
      roomCode
        .trim()
        .toUpperCase();


    if (!code) {

      alert(
        "Введи ID комнаты"
      );

      return;

    }


    setJoining(true);


    socket.emit(
      "get-room",
      code,
      (
        room: Room | null
      ) => {

        if (!room) {

          setJoining(false);

          alert(
            "Комната не найдена"
          );

          return;

        }


        const foundRoom: Room = {

          id:
            room.id,

          title:
            room.title,

          users:
            room.users,

          videoUrl:
            room.videoUrl

        };


        setActiveRoom(
          foundRoom
        );

        setJoinOpen(false);

        setRoomCode("");

        setJoining(false);

      }
    );

  }


  /*
    =========================
    SOCKET ERRORS
    =========================
  */

  useEffect(() => {

    function roomNotFound() {

      setJoining(false);

      alert(
        "Комната не найдена"
      );

    }


    socket.on(
      "room-not-found",
      roomNotFound
    );


    return () => {

      socket.off(
        "room-not-found",
        roomNotFound
      );

    };

  }, []);


  /*
    =========================
    WATCH ROOM
    =========================
  */

  if (activeRoom) {

    return (

      <WatchRoom

        name={
          activeRoom.title
        }

        videoUrl={
          activeRoom.videoUrl
        }

        roomId={
          activeRoom.id
        }

      />

    );

  }


  /*
    =========================
    HOME
    =========================
  */

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
          type="button"
          className="primary"
          onClick={() =>
            setCreateOpen(true)
          }
        >
          + Создать комнату
        </button>


        <button
          type="button"
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

          onCreate={
            createRoom
          }

          onClose={() =>
            setCreateOpen(false)
          }

        />

      )}


      {joinOpen && (

        <div className="modal-backdrop">

          <div className="room-modal">


            <button

              type="button"

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


            <div className="video-url-block">

              <label>
                ID комнаты
              </label>


              <input

                type="text"

                value={roomCode}

                onChange={
                  event =>
                    setRoomCode(
                      event.target.value
                    )
                }

                placeholder="Например K7M4QX"

                maxLength={6}

                autoFocus

                autoComplete="off"

                onKeyDown={
                  event => {

                    if (
                      event.key ===
                      "Enter"
                    ) {

                      event.preventDefault();

                      joinRoom();

                    }

                  }
                }

              />

            </div>


            <button

              type="button"

              className="join-submit-button"

              onClick={joinRoom}

              disabled={joining}

            >

              {joining
                ? "Подключение..."
                : "Войти"
              }

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


          {rooms.map(
            room => (

              <RoomCard

                key={room.id}

                title={
                  room.title
                }

                users={
                  room.users
                }

              />

            )
          )}

        </section>

      )}


    </main>

  );

}


export default App;
