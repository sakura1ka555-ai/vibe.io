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


// хранилище комнат
const rooms = {};


// проверка сервера
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


  // вход в комнату
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


      console.log(
        `User ${socket.id} joined ${roomId}`
      );

    }
  );



  // управление видео
  socket.on(
    "video-control",
    (data) => {

      socket.to(data.roomId).emit(
        "video-control",
        {
          action: data.action,
          position: data.position,
        }
      );


      console.log(
        "Video event:",
        data.action
      );

    }
  );



  // отключение пользователя
  socket.on(
    "disconnect",
    () => {


      console.log(
        "User disconnected:",
        socket.id
      );


      for (const roomId in rooms) {

        rooms[roomId] =
          rooms[roomId].filter(
            (id) => id !== socket.id
          );


        io.to(roomId).emit(
          "users",
          rooms[roomId].length
        );


        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        }

      }

    }
  );

});



// запуск сервера
app.listen({
  port: 3001,
  host: "0.0.0.0",
})
.then(() => {

  console.log(
    "🔥 VIBE server started on port 3001"
  );

});
