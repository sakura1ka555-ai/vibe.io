import { io } from "socket.io-client";


export const socket = io(
  "https://vibe-server-la2z.onrender.com",
  {
    transports: [
      "websocket"
    ]
  }
);


socket.on(
  "connect",
  () => {

    console.log(
      "🟢 VIBE connected:",
      socket.id
    );

  }
);


socket.on(
  "disconnect",
  () => {

    console.log(
      "🔴 VIBE disconnected"
    );

  }
);


export function joinRoom(
  roomId: string,
  userName = "Guest"
) {

  socket.emit(
    "join-room",
    {
      roomId,
      userName
    }
  );

}
