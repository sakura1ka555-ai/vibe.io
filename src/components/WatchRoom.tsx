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


  const [inviteCopied, setInviteCopied] =
    useState(false);


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
    REACTION
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


  /*
    =========================
    INVITE
    =========================
  */

  async function inviteFriend() {

    const inviteUrl =
      `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;


    const shareText =
      `🎬 Я смотрю в VIBE\nПрисоединяйся к комнате ${roomId}`;


    const telegramShareUrl =
      `https://t.me/share/url?url=${encodeURIComponent(
        inviteUrl
      )}&text=${encodeURIComponent(
        shareText
      )}`;


    /*
      Telegram Mini App
      */

    const telegramWebApp =
      window.Telegram?.WebApp;


    if (
      telegramWebApp?.openTelegramLink
    ) {

      telegramWebApp.openTelegramLink(
        telegramShareUrl
      );

      return;

    }


    /*
      Native share
      */

    if (
      navigator.share
    ) {

      try {

        await navigator.share({

          title:
            "VIBE",

          text:
            shareText,

          url:
            inviteUrl

        });

        return;

      } catch {

        /*
          Пользователь закрыл
          окно Share.
        */

      }

    }


    /*
      Clipboard fallback
      */

    try {

      await navigator.clipboard.writeText(
        inviteUrl
      );


      setInviteCopied(
        true
      );


      window.setTimeout(
        () => {

          setInviteCopied(
            false
          );

        },
        1800
      );


    } catch {

      window.open(
        telegramShareUrl,
        "_blank",
        "noopener,noreferrer"
      );

    }

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


          <div className="watch-header-actions">

            <button
              type="button"
              className="invite-button"
              onClick={
                inviteFriend
              }
            >

              <span className="invite-button-icon">
                ↗
              </span>

              <span>
                {
                  inviteCopied
                    ? "COPIED"
                    : "INVITE"
                }
              </span>

            </button>


            <div className="watch-users">

              <span className="watch-users-dot">
                ●
              </span>

              {users}

              <span className="watch-users-label">
                watching
              </span>

            </div>

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


          <div className="floating-reactions">

            {reactionsOnScreen.map(
              item => {

                const randomLeft =
                  15 +
                  (
                    Math.random() *
                    70
                  );


                return (

                  <div
                    key={
                      item.id
                    }
                    className="floating-reaction"
                    style={{
                      left:
                        `${randomLeft}%`
                    }}
                  >

                    <span>
                      {item.reaction}
                    </span>


                    <small>
                      {item.user}
                    </small>

                  </div>

                );

              }
            )}

          </div>


        </div>


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
