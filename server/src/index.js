import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";


const app = Fastify();


await app.register(cors, {
  origin: "*",
});


const io = new Server(
  app.server,
  {
    cors: {
      origin: "*",
    },
  }
);


const rooms = {};


app.get("/", async () => {
  return {
    app: "VIBE SERVER",
    status: "online",
  };
});


io.on("connection", (socket) => {

  console.log(
    "User connected:",
    socket.id
  );


  socket.on(
    "join-room",
    (roomId) => {

      socket.join(roomId);


      if (!rooms[roomId]) {
        rooms[roomId] = [];
      }


      rooms[roomId].push(socket.id);


      io.to(roomId).emit(
        "users",
        rooms[roomId].length
      );

    }
  );


  socket.on(
    "disconnect",
    () => {

      console.log(
        "User disconnected:",
        socket.id
      );

    }
  );

});


app.listen({
  port: 3001,
  host: "0.0.0.0",
})
.then(() => {

  console.log(
    "VIBE server started on 3001"
  );

});
