import { useState, useEffect } from "react";

import { socket } from "../socket";


type Message = {
  user:string;
  text:string;
};



function Chat({
  roomId
}:{
  roomId:string;
}) {


  const [messages,setMessages] =
    useState<Message[]>([]);


  const [text,setText] =
    useState("");




  useEffect(()=>{


    socket.on(
      "chat-message",
      (msg)=>{

        setMessages(
          prev=>[
            ...prev,
            msg
          ]
        );

      }
    );



    return ()=>{

      socket.off(
        "chat-message"
      );

    };


  },[]);







  function send(){


    if(!text.trim())
      return;



    socket.emit(
      "chat-message",
      {
        roomId,
        text
      }
    );


    setText("");

  }






  return (

    <aside className="chat">


      <h3>
        💬 Чат
      </h3>



      <div className="messages">

        {
          messages.map(
            (m,i)=>(

              <div key={i}
              className="message">

                <b>
                  {m.user}
                </b>

                <span>
                  {m.text}
                </span>

              </div>

            )
          )
        }

      </div>




      <div className="chat-input">


        <input

          value={text}

          onChange={
            e=>setText(e.target.value)
          }

          placeholder="Сообщение..."

        />


        <button onClick={send}>
          →
        </button>


      </div>



    </aside>

  );

}


export default Chat;
