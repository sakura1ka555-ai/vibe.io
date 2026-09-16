import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";


const app = Fastify();


await app.register(cors, {
  origin: "*"
});


/*
  Проверка сервера
*/

app.get("/", async () => {

  return {
    app: "VIBE SERVER",
    status: "online"
  };

});


/*
  Socket.IO
*/

const io = new Server(
  app.server,
  {
    cors: {
      origin: "*"
    }
  }
);


/*
  Комнаты

  Пока храним в памяти сервера.
  Если Render перезапустится —
  комнаты исчезнут.
*/

const rooms = {};


/*
  Подключение пользователя
*/

io.on("connection", (socket) => {

  console.log(
    "🟢 user connected:",
    socket.id
  );


  /*
    СОЗДАНИЕ КОМНАТЫ
  */

  socket.on(
    "create-room",
    (data) => {

      const roomId =
        String(data.roomId)
          .trim()
          .toUpperCase();


      if (!roomId) {
        return;
      }


      rooms[roomId] = {

        roomId,

        title:
          data.title ||
          `Комната ${roomId}`,

        videoUrl:
          data.videoUrl || "",

        users: 0

      };


      console.log(
        "🏠 room created:",
        roomId
      );

    }
  );


  /*
    ПОЛУЧЕНИЕ КОМНАТЫ
  */

  socket.on(
    "get-room",
    (roomId, callback) => {

      const id =
        String(roomId)
          .trim()
          .toUpperCase();


      const room =
        rooms[id];


      if (!room) {

        console.log(
          "❌ room not found:",
          id
        );


        if (callback) {
          callback(null);
        }

        return;

      }


      console.log(
        "🔎 room found:",
        id
      );


      if (callback) {

        callback({
          ...room
        });

      }

    }
  );


  /*
    ВХОД В КОМНАТУ
  */

  socket.on(
    "join-room",
    (roomId) => {

      const id =
        String(roomId)
          .trim()
          .toUpperCase();


      const room =
        rooms[id];


      if (!room) {

        socket.emit(
          "room-not-found"
        );

        return;

      }


      socket.join(id);


      room.users++;


      console.log(
        "👤 joined room:",
        id,
        "users:",
        room.users
      );


      io.to(id).emit(
        "users",
        room.users
      );


      socket.emit(
        "room-state",
        {
          roomId: room.roomId,
          title: room.title,
          videoUrl: room.videoUrl
        }
      );

    }
  );


  /*
    СИНХРОНИЗАЦИЯ ВИДЕО
  */

  socket.on(
    "video-control",
    (data) => {

      if (!data?.roomId) {
        return;
      }


      socket
        .to(data.roomId)
        .emit(
          "video-control",
          {
            action: data.action,
            position: data.position
          }
        );

    }
  );


  /*
    ЧАТ
  */

  socket.on(
    "chat-message",
    (data) => {

      if (!data?.roomId) {
        return;
      }


      if (!data?.text?.trim()) {
        return;
      }


      io.to(data.roomId).emit(
        "chat-message",
        {
          user: "Guest",
          text: data.text.trim()
        }
      );

    }
  );


  /*
    ОТКЛЮЧЕНИЕ
  */

  socket.on(
    "disconnect",
    () => {

      console.log(
        "🔴 user disconnected:",
        socket.id
      );

    }
  );

});


/*
  Запуск сервера
*/

const PORT =
  process.env.PORT || 3001;


app.listen({
  port: PORT,
  host: "0.0.0.0"
})
.then(() => {

  console.log(
    `🔥 VIBE server started on ${PORT}`
  );

});
