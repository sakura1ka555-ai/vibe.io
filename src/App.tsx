import RoomCard from "./components/RoomCard";

function App() {
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

      <button>
        + Создать комнату
      </button>

      <h2>
        Активные комнаты
      </h2>

      <RoomCard
        title="Вечерний фильм 🎬"
        users={3}
      />

      <RoomCard
        title="Ужастики ночью 👻"
        users={5}
      />
    </div>
  );
}

export default App;
