import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";


const app = Fastify();


await app.register(
  cors,
  {
    origin: "*"
  }
);


/*
  =========================
  HTTP
  =========================
*/

app.get(
  "/",
  async () => {

    return {
      app: "VIBE SERVER",
      status: "online"
    };

  }
);


/*
  =========================
  ROOMS
  =========================
*/

const rooms =
  new Map();


/*
  =========================
  CREATE ROOM
  =========================
*/

app.post(
  "/rooms",
  async (
    request,
    reply
  ) => {

    const data =
      request.body || {};


    const roomId =
      String(
        data.roomId || ""
      )
        .trim()
        .toUpperCase();


    if (!roomId) {

      return reply
        .code(400)
        .send({
          error:
            "Room ID is required"
        });

    }


    const room = {

      id:
        roomId,

      title:
        data.title ||
        `Комната ${roomId}`,

      videoUrl:
        data.videoUrl ||
        "",

      users: 0

    };


    rooms.set(
      roomId,
      room
    );


    console.log(
      "🏠 room created:",
      roomId
    );


    return {
      room
    };

  }
);


/*
  =========================
  GET ROOM
  =========================
*/

app.get(
  "/rooms/:roomId",
  async (
    request,
    reply
  ) => {

    const roomId =
      String(
        request.params.roomId || ""
      )
        .trim()
        .toUpperCase();


    const room =
      rooms.get(roomId);


    console.log(
      "🔎 room request:",
      roomId
    );


    if (!room) {

      return reply
        .code(404)
        .send({
          error:
            "Room not found"
        });

    }


    return {
      room
    };

  }
);


/*
  =========================
  SOCKET.IO
  =========================
*/

const io =
  new Server(
    app.server,
    {
      cors: {
        origin: "*",
        methods: [
          "GET",
          "POST"
        ]
      }
    }
  );


/*
  =========================
  SOCKET CONNECTION
  =========================
*/

io.on(
  "connection",
  (socket) => {

    console.log(
      "🟢 user connected:",
      socket.id
    );


    /*
      JOIN ROOM
    */

    socket.on(
      "join-room",
      (roomId) => {

        const id =
          String(
            roomId || ""
          )
            .trim()
            .toUpperCase();


        const room =
          rooms.get(id);


        if (!room) {

          socket.emit(
            "room-not-found"
          );

          return;

        }


        /*
          Не считаем
          одного socket дважды
        */

        if (
          socket.data.roomId ===
          id
        ) {

          return;

        }


        /*
          Если был
          в другой комнате
        */

        if (
          socket.data.roomId
        ) {

          const oldRoom =
            rooms.get(
              socket.data.roomId
            );


          if (oldRoom) {

            oldRoom.users =
              Math.max(
                0,
                oldRoom.users - 1
              );


            io.to(
              socket.data.roomId
            ).emit(
              "users",
              oldRoom.users
            );

          }


          socket.leave(
            socket.data.roomId
          );

        }


        socket.join(id);

        socket.data.roomId =
          id;


        room.users++;


        io.to(id).emit(
          "users",
          room.users
        );


        socket.emit(
          "room-state",
          {
            roomId:
              room.id,

            title:
              room.title,

            videoUrl:
              room.videoUrl
          }
        );


        console.log(
          "👤 joined:",
          id,
          "users:",
          room.users
        );

      }
    );


    /*
      VIDEO
    */

    socket.on(
      "video-control",
      (data) => {

        if (
          !data?.roomId
        ) {
          return;
        }


        socket
          .to(data.roomId)
          .emit(
            "video-control",
            {
              action:
                data.action,

              position:
                data.position
            }
          );

      }
    );


    /*
      CHAT
    */

    socket.on(
      "chat-message",
      (data) => {

        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();


        const text =
          String(
            data?.text || ""
          ).trim();


        if (
          !roomId ||
          !text
        ) {
          return;
        }


        if (
          !rooms.has(roomId)
        ) {
          return;
        }


        io.to(roomId).emit(
          "chat-message",
          {
            user: "Guest",
            text
          }
        );

      }
    );


    /*
      DISCONNECT
    */

    socket.on(
      "disconnect",
      () => {

        const roomId =
          socket.data.roomId;


        if (roomId) {

          const room =
            rooms.get(roomId);


          if (room) {

            room.users =
              Math.max(
                0,
                room.users - 1
              );


            io.to(roomId).emit(
              "users",
              room.users
            );

          }

        }


        console.log(
          "🔴 user disconnected:",
          socket.id
        );

      }
    );

  }
);


/*
  =========================
  START
  =========================
*/

const PORT =
  process.env.PORT || 3001;


app.listen({
  port: PORT,
  host: "0.0.0.0"
})
.then(
  () => {

    console.log(
      `🔥 VIBE server started on ${PORT}`
    );

  }
)
.catch(
  error => {

    console.error(
      error
    );

    process.exit(1);

  }
);
