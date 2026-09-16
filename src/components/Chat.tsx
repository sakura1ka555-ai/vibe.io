import {
  useEffect,
  useState
} from "react";


import {
  socket
} from "../socket";


type Message = {

  user: string;

  text: string;

};


type PresenceUser = {

  id: string;

  name: string;

  position: number;

  time: string;

};


type Props = {

  roomId: string;

  presence: PresenceUser[];

};


function Chat({
  roomId,
  presence
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

        text:
          message

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

        <div>

          <div className="chat-title">
            Чат
          </div>

          <div className="chat-online">

            <span>
              ●
            </span>

            {presence.length || 1}
            {" "}
            сейчас смотрят

          </div>

        </div>


        <div className="chat-room">
          {roomId}
        </div>

      </div>


      {/* =========================
          VIEWERS
      ========================= */}

      <div className="chat-viewers">

        <div className="chat-viewers-title">
          СЕЙЧАС СМОТРЯТ
        </div>


        <div className="chat-viewers-list">

          {presence.length === 0 && (

            <div className="viewer">

              <div className="viewer-avatar">
                G
              </div>

              <div className="viewer-info">

                <div className="viewer-name">
                  Guest
                </div>

                <div className="viewer-time">
                  00:00
                </div>

              </div>

            </div>

          )}


          {presence.map(
            person => (

              <div
                key={
                  person.id
                }
                className="viewer"
              >

                <div className="viewer-avatar">

                  {
                    person.name
                      .charAt(0)
                      .toUpperCase()
                  }

                </div>


                <div className="viewer-info">

                  <div className="viewer-name">

                    {person.name}

                  </div>


                  <div className="viewer-time">

                    <span className="viewer-live-dot">
                      ●
                    </span>

                    {person.time}

                  </div>

                </div>

              </div>

            )
          )}

        </div>

      </div>


      {/* =========================
          MESSAGES
      ========================= */}

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
              key={
                index
              }
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


      {/* =========================
          INPUT
      ========================= */}

      <div className="chat-input">

        <input

          type="text"

          value={
            text
          }

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
