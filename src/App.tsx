import {
  useEffect,
  useRef,
  useState
} from "react";

import CreateRoom from "./components/CreateRoom";
import RoomCard from "./components/RoomCard";
import WatchRoom from "./components/WatchRoom";

import {
  initTelegram,
  getTelegramUser
} from "./telegram";


const SERVER_URL =
  "https://vibe-server-la2z.onrender.com";


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


  const autoJoinStarted =
    useRef(false);


  /*
    =========================
    CREATE ROOM
  =========================
  */

  async function createRoom(
    videoUrl: string
  ) {

    const roomId =
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();


    const room: Room = {

      id:
        roomId,

      title:
        `Комната ${roomId}`,

      users:
        0,

      videoUrl

    };


    try {

      const response =
        await fetch(
          `${SERVER_URL}/rooms`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                roomId:
                  room.id,

                title:
                  room.title,

                videoUrl:
                  room.videoUrl
              })
          }
        );


      if (!response.ok) {

        throw new Error(
          "Не удалось создать комнату"
        );

      }


      setRooms(
        previous => [
          ...previous,
          room
        ]
      );


      setCreateOpen(
        false
      );


      setActiveRoom(
        room
      );

    } catch (error) {

      console.error(
        error
      );


      alert(
        "Не удалось создать комнату. Проверь соединение с сервером."
      );

    }

  }


  /*
    =========================
    JOIN ROOM
  =========================
  */

  async function joinRoom(
    codeFromUrl?: string
  ) {

    const code =
      (
        codeFromUrl ??
        roomCode
      )
        .trim()
        .toUpperCase();


    if (!code) {

      alert(
        "Введи ID комнаты"
      );

      return;

    }


    setJoining(
      true
    );


    try {

      const response =
        await fetch(
          `${SERVER_URL}/rooms/${encodeURIComponent(code)}`
        );


      if (
        response.status ===
        404
      ) {

        alert(
          "Комната не найдена"
        );

        return;

      }


      if (!response.ok) {

        throw new Error(
          "Ошибка сервера"
        );

      }


      const data =
        await response.json();


      if (
        !data?.room
      ) {

        alert(
          "Комната не найдена"
        );

        return;

      }


      const room =
        data.room;


      const foundRoom: Room = {

        id:
          room.id ||
          room.roomId,

        title:
          room.title ||
          `Комната ${code}`,

        users:
          room.users ||
          0,

        videoUrl:
          room.videoUrl ||
          ""

      };


      setActiveRoom(
        foundRoom
      );


      setJoinOpen(
        false
      );


      setRoomCode(
        ""
      );


      /*
        Убираем ?room=XXXX
        из адресной строки,
        но страницу не перезагружаем.
      */

      try {

        const cleanUrl =
          window.location.origin +
          window.location.pathname;


        window.history.replaceState(
          {},
          "",
          cleanUrl
        );

      } catch {

        // ничего

      }

    } catch (error) {

      console.error(
        error
      );


      alert(
        "Не удалось подключиться к серверу. Попробуй ещё раз."
      );

    } finally {

      setJoining(
        false
      );

    }

  }


  /*
    =========================
    AUTO JOIN FROM LINK
  =========================
  */

  useEffect(() => {

    if (
      autoJoinStarted.current
    ) {

      return;

    }


    autoJoinStarted.current =
      true;


    const params =
      new URLSearchParams(
        window.location.search
      );


    const roomFromLink =
      params.get(
        "room"
      );


    if (
      roomFromLink
    ) {

      const code =
        roomFromLink
          .trim()
          .toUpperCase();


      setRoomCode(
        code
      );


      void joinRoom(
        code
      );

    }

  }, []);


  /*
    =========================
    KEYBOARD
  =========================
  */

  function handleRoomCodeKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();


      if (
        !joining
      ) {

        void joinRoom();

      }

    }

  }


  /*
    =========================
    ACTIVE ROOM
  =========================
  */

  if (
    activeRoom
  ) {

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
            setCreateOpen(
              true
            )
          }

        >

          + Создать комнату

        </button>


        <button

          type="button"

          className="secondary"

          onClick={() =>
            setJoinOpen(
              true
            )
          }

        >

          Войти в комнату

        </button>


      </section>


      {/* =========================
          CREATE
      ========================= */}

      {createOpen && (

        <CreateRoom

          onCreate={
            createRoom
          }

          onClose={() =>
            setCreateOpen(
              false
            )
          }

        />

      )}


      {/* =========================
          JOIN
      ========================= */}

      {joinOpen && (

        <div className="modal-backdrop">


          <div className="room-modal">


            <button

              type="button"

              className="modal-close"

              onClick={() =>
                setJoinOpen(
                  false
                )
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

                value={
                  roomCode
                }

                onChange={
                  event =>
                    setRoomCode(
                      event.target.value
                    )
                }

                onKeyDown={
                  handleRoomCodeKeyDown
                }

                placeholder="Например K7M4QX"

                maxLength={6}

                autoFocus

                autoComplete="off"

              />


            </div>


            <button

              type="button"

              className="join-submit-button"

              onClick={() =>
                void joinRoom()
              }

              disabled={
                joining
              }

            >

              {joining
                ? "Подключение..."
                : "Войти"
              }

            </button>


          </div>


        </div>

      )}


      {/* =========================
          PROFILE
      ========================= */}

      {user && (

        <div className="profile">

          {user.first_name}

        </div>

      )}


      {/* =========================
          ROOMS
      ========================= */}

      {rooms.length > 0 && (

        <section className="rooms">


          <h2>

            Ваши комнаты

          </h2>


          {rooms.map(
            room => (

              <RoomCard

                key={
                  room.id
                }

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
