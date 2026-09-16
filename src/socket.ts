import { io } from "socket.io-client";


export const socket = io(
  "http://localhost:3001",
  {
    autoConnect: true
  }
);



export function joinRoom(
  roomId: string
) {

  socket.emit(
    "join-room",
    roomId
  );

}
