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

      users: 0,

      playback: {
        action: "pause",
        position: 0
      }

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
  HELPERS
  =========================
*/

function formatPosition(
  seconds
) {

  const total =
    Math.max(
      0,
      Math.floor(
        Number(seconds) || 0
      )
    );


  const minutes =
    Math.floor(
      total / 60
    );


  const secs =
    total % 60;


  return (
    String(minutes)
      .padStart(2, "0")
    +
    ":"
    +
    String(secs)
      .padStart(2, "0")
  );

}


function getPresence(
  roomId
) {

  const result = [];


  for (
    const connectedSocket of
    io.sockets.sockets.values()
  ) {

    if (
      connectedSocket.data.roomId !==
      roomId
    ) {
      continue;
    }


    result.push({

      id:
        connectedSocket.id,

      name:
        connectedSocket.data.userName ||
        "Guest",

      position:
        Number(
          connectedSocket.data.position || 0
        ),

      time:
        formatPosition(
          connectedSocket.data.position
        )

    });

  }


  return result;

}


function emitPresence(
  roomId
) {

  io.to(roomId).emit(
    "presence",
    getPresence(roomId)
  );

}


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
      =========================
      JOIN ROOM
      =========================
    */

    socket.on(
      "join-room",
      (data) => {

        const roomId =
          String(
            typeof data === "string"
              ? data
              : data?.roomId || ""
          )
            .trim()
            .toUpperCase();


        const userName =
          String(
            typeof data === "string"
              ? "Guest"
              : data?.userName || "Guest"
          )
            .trim()
            .slice(
              0,
              40
            );


        const room =
          rooms.get(roomId);


        if (!room) {

          socket.emit(
            "room-not-found"
          );

          return;

        }


        /*
          Если уже
          в этой комнате
        */

        if (
          socket.data.roomId ===
          roomId
        ) {

          return;

        }


        /*
          Уходим
          из старой комнаты
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


            emitPresence(
              socket.data.roomId
            );

          }


          socket.leave(
            socket.data.roomId
          );

        }


        socket.join(
          roomId
        );


        socket.data.roomId =
          roomId;


        socket.data.userName =
          userName || "Guest";


        socket.data.position =
          room.playback.position;


        room.users++;


        /*
          Состояние комнаты
        */

        socket.emit(
          "room-state",
          {

            roomId:
              room.id,

            title:
              room.title,

            videoUrl:
              room.videoUrl,

            action:
              room.playback.action,

            position:
              room.playback.position

          }
        );


        io.to(roomId).emit(
          "users",
          room.users
        );


        emitPresence(
          roomId
        );


        console.log(
          "👤 joined:",
          roomId,
          socket.data.userName,
          "users:",
          room.users
        );

      }
    );


    /*
      =========================
      VIDEO CONTROL
      =========================
    */

    socket.on(
      "video-control",
      (data) => {

        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();


        if (!roomId) {
          return;
        }


        const room =
          rooms.get(roomId);


        if (!room) {
          return;
        }


        const action =
          data?.action === "play"
            ? "play"
            : "pause";


        const position =
          Math.max(
            0,
            Number(
              data?.position || 0
            )
          );


        room.playback = {

          action,

          position

        };


        socket.data.position =
          position;


        socket.data.userName =
          socket.data.userName ||
          "Guest";


        /*
          Отправляем
          всем остальным
        */

        socket
          .to(roomId)
          .emit(
            "video-control",
            {

              action,

              position,

              source:
                socket.id

            }
          );


        emitPresence(
          roomId
        );

      }
    );


    /*
      =========================
      VIDEO POSITION
      =========================
    */

    socket.on(
      "video-position",
      (data) => {

        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();


        if (!roomId) {
          return;
        }


        const position =
          Math.max(
            0,
            Number(
              data?.position || 0
            )
          );


        socket.data.position =
          position;


        /*
          Позицию самого видео
          сохраняем в комнате
        */

        const room =
          rooms.get(roomId);


        if (room) {

          room.playback.position =
            position;

        }


        /*
          Обновляем участников
        */

        emitPresence(
          roomId
        );

      }
    );


    /*
      =========================
      CHAT
      =========================
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

            user:
              socket.data.userName ||
              "Guest",

            text

          }
        );

      }
    );


    /*
      =========================
      DISCONNECT
      =========================
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


            emitPresence(
              roomId
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
