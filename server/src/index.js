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
    status: "online"
  };

});



io.on(
  "connection",
  (socket) => {


    console.log(
      "User connected:",
      socket.id
    );



    socket.on(
      "create-room",
      (data) => {


        rooms[data.roomId] = {

          roomId:
            data.roomId,

          videoUrl:
            data.videoUrl,

          title:
            data.title,

          users: []

        };


        console.log(
          "Room created:",
          data.roomId
        );


      }
    );





    socket.on(
      "join-room",
      (roomId) => {


        socket.join(roomId);



        if (!rooms[roomId]) {

          rooms[roomId] = {

            roomId,

            videoUrl: "",

            title: "VIBE Room",

            users: []

          };

        }



        rooms[roomId].users.push(
          socket.id
        );



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
            id =>
            id !== socket.id
          );


        }


      }
    );


  }
);




app.listen({

  port: 3001,

  host: "0.0.0.0"

})
.then(() => {

  console.log(
    "🔥 VIBE server started"
  );

});
