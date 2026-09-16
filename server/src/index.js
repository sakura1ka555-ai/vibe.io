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


// состояние комнат
const rooms = {};



app.get("/", async () => {

  return {
    app: "VIBE SERVER",
    status: "online"
  };

});



io.on("connection", (socket) => {


  console.log(
    "Connected:",
    socket.id
  );



  socket.on(
    "join-room",
    (roomId) => {


      socket.join(roomId);



      if (!rooms[roomId]) {

        rooms[roomId] = {

          videoUrl:
          "https://www.w3schools.com/html/mov_bbb.mp4",

          position: 0,

          playing: false,

          users: []

        };

      }



      rooms[roomId].users.push(
        socket.id
      );



      // отправляем новое состояние
      socket.emit(
        "room-state",
        rooms[roomId]
      );



      io.to(roomId).emit(
        "users",
        rooms[roomId].users.length
      );


    }
  );




  socket.on(
    "video-control",
    (data) => {


      const room =
        rooms[data.roomId];


      if (!room) return;



      room.position =
        data.position;



      if (
        data.action === "play"
      ) {

        room.playing = true;

      }



      if (
        data.action === "pause"
      ) {

        room.playing = false;

      }



      socket.to(data.roomId)
      .emit(
        "video-control",
        data
      );


    }
  );




  socket.on(
    "disconnect",
    () => {


      for (
        const roomId in rooms
      ) {


        rooms[roomId].users =
          rooms[roomId].users
          .filter(
            id => id !== socket.id
          );



        io.to(roomId).emit(
          "users",
          rooms[roomId].users.length
        );



        if (
          rooms[roomId].users.length === 0
        ) {

          delete rooms[roomId];

        }

      }


    }
  );


});



app.listen({

  port: 3001,

  host: "0.0.0.0"

})
.then(() => {

  console.log(
    "🔥 VIBE SERVER running"
  );

});
