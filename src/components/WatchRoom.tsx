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

};


type Props = {

  name: string;

  videoUrl: string;

  roomId: string;

};


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
    JOIN
    =========================
  */

  useEffect(() => {

    joinRoom(
      roomId,
      userName
    );


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

    };

  }, [
    roomId,
    userName
  ]);


  /*
    =========================
    SEND CONTROL
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
    SEND POSITION
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
