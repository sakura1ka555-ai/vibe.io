import {
  useEffect,
  useState
} from "react";

import Chat from "./Chat";
import VideoPlayer from "./VideoPlayer";

import {
  socket,
  joinRoom
} from "../socket";


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

  const [users, setUsers] =
    useState(1);


  useEffect(() => {

    joinRoom(roomId);


    function handleUsers(
      count: number
    ) {

      setUsers(count);

    }


    socket.on(
      "users",
      handleUsers
    );


    return () => {

      socket.off(
        "users",
        handleUsers
      );

    };

  }, [roomId]);


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
            videoUrl={videoUrl}
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
          roomId={roomId}
        />

      </aside>


    </main>

  );

}


export default WatchRoom;
