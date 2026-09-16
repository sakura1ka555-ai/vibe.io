import { useState } from "react";
import RoomCard from "./components/RoomCard";
import WatchRoom from "./components/WatchRoom";

type Room = {
  title: string;
  users: number;
};

function App() {
  const [rooms, setRooms] = useState<Room[]>([
    {
      title: "Вечерний фильм 🎬",
      users: 3,
    },
    {
      title: "Ужастики ночью 👻",
      users: 5,
    },
  ]);

  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  function createRoom() {
    const newRoom = {
      title: "Новая VIBE-комната ✨",
      users: 1,
    };

    setRooms([
      ...rooms,
      newRoom,
    ]);
  }

  if (activeRoom) {
    return (
      <WatchRoom
        name={activeRoom}
      />
    );
  }

  return (
    <div className="app">

      <div className="logo">
        VIBE
      </div>

      <h1>
        Кино вместе
      </h1>

      <p>
        Создавай комнаты и смотри фильмы
        с друзьями одновременно
      </p>

      <button onClick={createRoom}>
        + Создать комнату
      </button>


      <h2>
        Активные комнаты
      </h2>


      {rooms.map((room, index) => (
        <div
          key={index}
          onClick={() => setActiveRoom(room.title)}
        >
          <RoomCard
            title={room.title}
            users={room.users}
          />
        </div>
      ))}

    </div>
  );
}

export default App;
