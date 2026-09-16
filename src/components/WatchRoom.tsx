import {
  useCallback,
  useEffect,
  useState
} from "react";


import Chat from "./Chat";
import VideoPlayer from "./VideoPlayer";


import {
  socket,
  joinRoom
} from "../socket";


import {
  getTelegramUser
} from "../telegram";


type PresenceUser = {

  id: string;

  name: string;

  position: number;

  time: string;

  state?: "play" | "pause";

};


type Reaction = {

  id: string;

  reaction: string;

  user: string;

};


type Props = {

  name: string;

  videoUrl: string;

  roomId: string;

};


const reactions = [
  "❤️",
  "😂",
  "🔥",
  "😮",
  "😭",
  "💀"
];


function WatchRoom({
  name,
  videoUrl,
  roomId
}: Props) {

  const telegramUser =
    getTelegramUser();


  const userName =
    telegramUser?.first_name ||
    "Guest";


  const [users, setUsers] =
    useState(1);


  const [presence, setPresence] =
    useState<PresenceUser[]>([]);


  const [reactionsOnScreen, setReactionsOnScreen] =
    useState<Reaction[]>([]);


  const [initialPosition, setInitialPosition] =
    useState(0);


  const [initialAction, setInitialAction] =
    useState<
      "play" | "pause"
    >(
      "pause"
    );


  const [remoteControl, setRemoteControl] =
    useState<{
      action:
        "play" | "pause";

      position: number;

      id: number;

    } | null>(
      null
    );


  /*
    =========================
    JOIN ROOM
    =========================
  */

  useEffect(() => {

    function handleUsers(
      count: number
    ) {

      setUsers(
        count
      );

    }


    function handlePresence(
      people: PresenceUser[]
    ) {

      setPresence(
        people
      );

    }


    function handleRoomState(
      state: {
        action:
          "play" | "pause";

        position: number;
      }
    ) {

      setInitialAction(
        state.action
      );


      setInitialPosition(
        state.position || 0
      );

    }


    function handleRemoteControl(
      data: {
        action:
          "play" | "pause";

        position: number;
      }
    ) {

      setRemoteControl({
        action:
          data.action,

        position:
          data.position,

        id:
          Date.now()
      });

    }


    function handleReaction(
      reaction: Reaction
    ) {

      setReactionsOnScreen(
        previous => [
          ...previous,
          reaction
        ]
      );


      /*
        Automatically remove
        reaction after animation.
      */

      window.setTimeout(
        () => {

          setReactionsOnScreen(
            previous =>
              previous.filter(
                item =>
                  item.id !==
                  reaction.id
              )
          );

        },
        2800
      );

    }


    /*
      Сначала слушаем события.
      Потом подключаемся к комнате.
    */

    socket.on(
      "users",
      handleUsers
    );


    socket.on(
      "presence",
      handlePresence
    );


    socket.on(
      "room-state",
      handleRoomState
    );


    socket.on(
      "video-control",
      handleRemoteControl
    );


    socket.on(
      "reaction",
      handleReaction
    );


    joinRoom(
      roomId,
      userName
    );


    return () => {

      socket.off(
        "users",
        handleUsers
      );


      socket.off(
        "presence",
        handlePresence
      );


      socket.off(
        "room-state",
        handleRoomState
      );


      socket.off(
        "video-control",
        handleRemoteControl
      );


      socket.off(
        "reaction",
        handleReaction
      );

    };

  }, [
    roomId,
    userName
  ]);


  /*
    =========================
    VIDEO CONTROL
    =========================
  */

  const handleControl =
    useCallback(
      (
        action:
          "play" | "pause",

        position:
          number
      ) => {

        socket.emit(
          "video-control",
          {

            roomId,

            action,

            position

          }
        );

      },
      [
        roomId
      ]
    );


  /*
    =========================
    VIDEO POSITION
    =========================
  */

  const handlePosition =
    useCallback(
      (
        position: number
      ) => {

        socket.emit(
          "video-position",
          {

            roomId,

            position

          }
        );

      },
      [
        roomId
      ]
    );


  /*
    =========================
    SEND REACTION
    =========================
  */

  function sendReaction(
    reaction: string
  ) {

    socket.emit(
      "reaction",
      {

        roomId,

        reaction

      }
    );

  }


  return (

    <main className="watch-room">


      <section className="watch-main">


        <header className="watch-header">

          <div className="watch-title-group">

            <div className="watch-label">
              VIBE ROOM
            </div>


            <h1>
              {name}
            </h1>


            <div className="watch-room-code">
              ID: {roomId}
            </div>

          </div>


          <div className="watch-users">

            <span className="watch-users-dot">
              ●
            </span>

            {users}

            <span className="watch-users-label">
              watching
            </span>

          </div>

        </header>


        <div className="video-frame">


          <VideoPlayer

            videoUrl={
              videoUrl
            }

            initialPosition={
              initialPosition
            }

            initialAction={
              initialAction
            }

            onControl={
              handleControl
            }

            onPosition={
              handlePosition
            }

            remoteControl={
              remoteControl
            }

          />


          {/* =========================
              FLOATING REACTIONS
          ========================= */}

          <div className="floating-reactions">

            {reactionsOnScreen.map(
              item => (

                <div
                  key={
                    item.id
                  }
                  className="floating-reaction"
                >

                  <span>
                    {item.reaction}
                  </span>


                  <small>
                    {item.user}
                  </small>

                </div>

              )
            )}

          </div>


        </div>


        {/* =========================
            REACTION BAR
        ========================= */}

        <div className="reaction-bar">

          <div className="reaction-label">
            REACT
          </div>


          <div className="reaction-buttons">

            {reactions.map(
              reaction => (

                <button
                  key={
                    reaction
                  }

                  type="button"

                  className="reaction-button"

                  onClick={() =>
                    sendReaction(
                      reaction
                    )
                  }

                  aria-label={
                    `Отправить ${reaction}`
                  }
                >

                  {reaction}

                </button>

              )
            )}

          </div>

        </div>


        <div className="watch-bottom">

          <div className="watch-bottom-status">

            <span className="status-dot">
              ●
            </span>

            VIBE ROOM

          </div>


          <div className="watch-bottom-code">

            ROOM

            <strong>
              {roomId}
            </strong>

          </div>

        </div>


      </section>


      <aside className="watch-sidebar">

        <Chat

          roomId={
            roomId
          }

          presence={
            presence
          }

        />

      </aside>


    </main>

  );

}


export default WatchRoom;
