import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";


const app = Fastify();


await app.register(cors, {

  origin: "*"

});



app.get("/", async ()=>{

  return {

    app:"VIBE SERVER",

    status:"online"

  };

});





const io = new Server(
  app.server,
  {

    cors:{

      origin:"*"

    }

  }
);





const rooms = {};





io.on(
  "connection",
  (socket)=>{


    console.log(
      "🟢 user:",
      socket.id
    );





    socket.on(
      "create-room",
      (data)=>{


        rooms[data.roomId] = {

          title:data.title,

          videoUrl:data.videoUrl,

          users:1

        };


      }
    );








    socket.on(
      "join-room",
      (roomId)=>{


        socket.join(roomId);



        if(!rooms[roomId]){

          rooms[roomId] = {

            users:0

          };

        }



        rooms[roomId].users++;



        io.to(roomId).emit(
          "users",
          rooms[roomId].users
        );


      }
    );









    socket.on(
      "video-control",
      (data)=>{


        socket.to(
          data.roomId
        ).emit(
          "video-control",
          data
        );


      }
    );









    socket.on(
      "chat-message",
      (data)=>{


        io.to(
          data.roomId
        ).emit(
          "chat-message",
          {

            user:"Guest",

            text:data.text

          }
        );


      }
    );







    socket.on(
      "disconnect",
      ()=>{

        console.log(
          "🔴 left:",
          socket.id
        );

      }
    );



  }
);







const PORT =
process.env.PORT || 3001;



app.listen({

  port:PORT,

  host:"0.0.0.0"

})
.then(()=>{


  console.log(
    "🔥 VIBE server started on",
    PORT
  );


});
