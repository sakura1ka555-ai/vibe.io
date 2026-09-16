import { io } from "socket.io-client";


const SERVER_URL = "http://localhost:3001";


export const socket = io(
  SERVER_URL,
  {
    autoConnect: false,
  }
);


export function joinRoom(roomId: string) {

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit(
    "join-room",
    roomId
  );

}
