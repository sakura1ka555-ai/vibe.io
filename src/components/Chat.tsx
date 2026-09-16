import {
  useEffect,
  useState
} from "react";

import { socket } from "../socket";


type Message = {
  user: string;
  text: string;
};


type Props = {
  roomId: string;
};


function Chat({
  roomId
}: Props) {

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [text, setText] =
    useState("");


  useEffect(() => {

    function handleMessage(
      message: Message
    ) {

      setMessages(
        previous => [
          ...previous,
          message
        ]
      );

    }


    socket.on(
      "chat-message",
      handleMessage
    );


    return () => {

      socket.off(
        "chat-message",
        handleMessage
      );

    };

  }, []);


  function sendMessage() {

    const message =
      text.trim();


    if (!message) {
      return;
    }


    socket.emit(
      "chat-message",
      {
        roomId,
        text: message
      }
    );


    setText("");

  }


  function handleKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {

    if (
      event.key ===
      "Enter"
    ) {

      event.preventDefault();

      sendMessage();

    }

  }


  return (

    <div className="chat">


      <div className="chat-header">

        <div className="chat-title">
          Чат
        </div>

        <div className="chat-room">
          {roomId}
        </div>

      </div>


      <div className="messages">

        {messages.length === 0 && (

          <div className="chat-empty">
            Здесь появятся сообщения
          </div>

        )}


        {messages.map(
          (
            message,
            index
          ) => (

            <div
              key={index}
              className="message"
            >

              <b>
                {message.user}
              </b>

              <span>
                {message.text}
              </span>

            </div>

          )
        )}

      </div>


      <div className="chat-input">

        <input

          type="text"

          value={text}

          onChange={
            event =>
              setText(
                event.target.value
              )
          }

          onKeyDown={
            handleKeyDown
          }

          placeholder="Сообщение..."

          autoComplete="off"

        />


        <button

          type="button"

          onClick={
            sendMessage
          }

        >
          →
        </button>

      </div>


    </div>

  );

}


export default Chat;
