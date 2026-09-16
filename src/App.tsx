import { useState } from "react";
import RoomCard from "./components/RoomCard";

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

  function createRoom() {
    const newRoom: Room = {
      title: "Новая VIBE-комната ✨",
      users: 1,
    };

    setRooms([
      ...rooms,
      newRoom,
    ]);
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
        <RoomCard
          key={index}
          title={room.title}
          users={room.users}
        />
      ))}
    </div>
  );
}

export default App;
