import { io } from "socket.io-client";


export const socket = io(
  "http://localhost:3001",
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
  roomId:string
) {

  socket.emit(
    "join-room",
    roomId
  );

}
