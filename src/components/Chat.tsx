import {
  useEffect,
  useState
} from "react";

import {
  socket,
  sendChatMessage
} from "../socket";


type Message = {
  id: string;
  user: string;
  text: string;
  avatar?: string;
};


type PresenceUser = {
  id: string;
  name: string;
  position: number;
  time: string;
  state?: "play" | "pause";
  avatar?: string;
};


type Props = {
  roomId: string;
  presence: PresenceUser[];
};


type IncomingMessage = {
  id?: string | number;
  roomId?: string;
  user?: string;
  name?: string;
  text?: string;
  avatar?: string;
};


function Chat({
  roomId,
  presence
}: Props) {

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [text, setText] =
    useState("");


  /*
    =========================
    CHAT
    =========================
  */

  useEffect(() => {

    function handleMessage(
      data: IncomingMessage
    ) {

      if (!data) {
        return;
      }


      if (
        data.roomId &&
        String(data.roomId) !==
          String(roomId)
      ) {

        return;

      }


      const messageText =
        String(
          data.text || ""
        ).trim();


      if (!messageText) {
        return;
      }


      const user =
        String(
          data.user ||
          data.name ||
          "Guest"
        )
          .trim()
          .slice(0, 40) ||
        "Guest";


      const messageId =
        String(
          data.id ||
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 9)}`
        );


      const message: Message = {

        id:
          messageId,

        user:
          user,

        text:
          messageText,

        avatar:
          String(
            data.avatar || ""
          )

      };


      setMessages(
        previous => {

          if (
            previous.some(
              item =>
                item.id ===
                message.id
            )
          ) {

            return previous;

          }


          return [
            ...previous,
            message
          ];

        }
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

  }, [
    roomId
  ]);


  /*
    =========================
    SEND
    =========================
  */

  function sendMessage() {

    const message =
      text.trim();


    if (!message) {
      return;
    }


    if (!roomId) {
      return;
    }


    sendChatMessage(
      roomId,
      message
    );


    setText("");

  }


  /*
    =========================
    KEYBOARD
    =========================
  */

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


  /*
    =========================
    AVATAR
    =========================
  */

  function getAvatarLetter(
    name: string
  ) {

    return (
      name ||
      "G"
    )
      .charAt(0)
      .toUpperCase();

  }


  /*
    =========================
    VIEWERS
    =========================
  */

  const viewerCount =
    Math.max(
      1,
      presence.length
    );


  /*
    =========================
    UI
    =========================
  */

  return (

    <div className="chat">


      {/* HEADER */}

      <div className="chat-header">

        <div>

          <div className="chat-title">
            Чат
          </div>


          <div className="chat-online">

            <span>
              ●
            </span>

            {viewerCount}

            {" "}

            сейчас смотрят

          </div>

        </div>


        <div className="chat-room">

          {roomId}

        </div>

      </div>


      {/* VIEWERS */}

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
                key={person.id}
                className="viewer"
              >

                <div className="viewer-avatar">

                  {person.avatar ? (

                    <img
                      src={person.avatar}
                      alt=""
                      className="viewer-avatar-image"
                    />

                  ) : (

                    getAvatarLetter(
                      person.name
                    )

                  )}

                </div>


                <div className="viewer-info">

                  <div className="viewer-name">

                    {person.name ||
                      "Guest"}

                  </div>


                  <div className="viewer-time">

                    <span className="viewer-live-dot">

                      ●

                    </span>

                    {person.time ||
                      "00:00"}

                  </div>

                </div>

              </div>

            )
          )}

        </div>

      </div>


      {/* MESSAGES */}

      <div className="messages">

        {messages.map(
          message => (

            <div
              key={message.id}
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


      {/* INPUT */}

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
          maxLength={500}
        />


        <button
          type="button"
          onClick={sendMessage}
          disabled={
            !text.trim()
          }
          aria-label="Отправить сообщение"
        >

          →

        </button>

      </div>


    </div>

  );

}


export default Chat;
