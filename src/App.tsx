import { useState } from "react";

function createRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function App() {
  const [roomName, setRoomName] = useState("");

  function handleCreateRoom() {
    const id = createRoomId();

    window.location.href = `/room/${id}`;
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="logo">VIBE</div>
      </header>

      <section className="home">
        <div className="home-content">
          <div className="eyebrow">WATCH TOGETHER</div>

          <h1>
            Movies are better
            <br />
            <span>together.</span>
          </h1>

          <p>
            Watch movies and videos together in real time.
            Create a room and invite your friends.
          </p>

          <div className="room-form">
            <input
              type="text"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Room name"
              maxLength={40}
            />

            <button type="button" onClick={handleCreateRoom}>
              Create room
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
