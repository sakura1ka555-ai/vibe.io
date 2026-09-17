import { useState } from "react";

function createRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function App() {
  const [roomName, setRoomName] = useState("");
  const [roomId, setRoomId] = useState("");

  function handleCreateRoom() {
    const id = createRoomId();
    setRoomId(id);
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

          {roomId && (
            <div
              style={{
                marginTop: "18px",
                color: "rgba(255, 255, 255, 0.45)",
                fontSize: "11px",
              }}
            >
              Room created:{" "}
              <strong style={{ color: "#9a63c8" }}>
                {roomId}
              </strong>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
