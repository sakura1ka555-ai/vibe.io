import {
  useEffect,
  useRef,
  useState
} from "react";

import VideoPlayer from "./VideoPlayer";
import Chat from "./Chat";
import ProfileModal from "./ProfileModal";

import {
  socket,
  joinRoom,
  sendVideoControl,
  sendVideoPosition
} from "../socket";


type Profile = {
  name: string;
  avatar: string;
};


type PresenceUser = {
  id: string;
  name: string;
  position: number;
  time: string;
  state?: "play" | "pause";
  avatar?: string;
};


type Reaction = {
  id?: string | number;
  emoji?: string;
  user?: string;
};


type Props = {
  name: string;
  videoUrl: string;
  roomId: string;
  profile: Profile;
  onProfileChange: (
    profile: Profile
  ) => void;
};


function WatchRoom({
  name,
  videoUrl,
  roomId,
  profile,
  onProfileChange
}: Props) {

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
    >("pause");

  const [remoteControl, setRemoteControl] =
    useState<{
      action:
        | "play"
        | "pause";
      position: number;
      id: number;
    } | null>(null);


  const userIdRef =
    useRef<string>("");


  /*
    =========================
    USER ID
    =========================
  */

  useEffect(() => {

    try {

      let saved =
        localStorage.getItem(
          "vibe-user-id"
        );


      if (!saved) {

        saved =
          `user-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;


        localStorage.setItem(
          "vibe-user-id",
          saved
        );

      }


      userIdRef.current =
        saved;

    } catch {

      userIdRef.current =
        `user-${Date.now()}`;

    }

  }, []);


  /*
    =========================
    ROOM / SOCKET
    =========================
  */

  useEffect(() => {

    let mounted = true;


    function normalizePresence(
      data: any
    ): PresenceUser[] {

      if (
        Array.isArray(data)
      ) {

        return data;

      }


      if (
        Array.isArray(
          data?.users
        )
      ) {

        return data.users;

      }


      if (
        Array.isArray(
          data?.presence
        )
      ) {

        return data.presence;

      }


      if (
        Array.isArray(
          data?.participants
        )
      ) {

        return data.participants;

      }


      return [];

    }


    function applyPresence(
      data: unknown
    ) {

      if (!mounted) {
        return;
      }


      const people =
        normalizePresence(
          data
        );


      console.log(
        "👥 VIBE PRESENCE:",
        people
      );


      setPresence(
        people
      );


      setUsers(
        people.length
      );

    }


    function handleUsers(
      count: number
    ) {

      if (
        presence.length === 0 &&
        Number.isFinite(count)
      ) {

        setUsers(
          Math.max(
            1,
            count
          )
        );

      }

    }


    function handleRoomState(
      state: {
        action:
          | "play"
          | "pause";
        position: number;
      }
    ) {

      if (!mounted) {
        return;
      }


      if (!state) {
        return;
      }


      setInitialPosition(
        Number(
          state.position
        ) || 0
      );


      setInitialAction(
        state.action ===
        "play"
          ? "play"
          : "pause"
      );

    }


    function handleRemoteControl(
      data: {
        action:
          | "play"
          | "pause";
        position: number;
        id?: number;
      }
    ) {

      if (!mounted) {
        return;
      }


      if (!data) {
        return;
      }


      setRemoteControl({
        action:
          data.action ===
          "play"
            ? "play"
            : "pause",

        position:
          Number(
            data.position
          ) || 0,

        id:
          Number(
            data.id
          ) ||
          Date.now()
      });

    }


    function handleReaction(
      reaction: Reaction
    ) {

      if (!mounted) {
        return;
      }


      if (!reaction) {
        return;
      }


      const id =
        reaction.id ??
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;


      const item = {
        ...reaction,
        id
      };


      setReactionsOnScreen(
        previous => [
          ...previous,
          item
        ]
      );


      setTimeout(() => {

        if (!mounted) {
          return;
        }


        setReactionsOnScreen(
          previous =>
            previous.filter(
              current =>
                current.id !==
                id
            )
        );

      }, 2500);

    }


    /*
      =========================
      LISTENERS
      =========================
    */

    socket.on(
      "users",
      handleUsers
    );

    socket.on(
      "presence",
      applyPresence
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


    /*
      =========================
      JOIN
      =========================
    */

    joinRoom(
      roomId,
      name
    );


    const profileUpdateTimer =
      setTimeout(() => {

        socket.emit(
          "profile-update",
          {
            roomId,
            name,
            avatar:
              profile.avatar ||
              ""
          }
        );

      }, 100);


    /*
      =========================
      RECONNECT
      =========================
    */

    function handleReconnect() {

      console.log(
        "🔄 VIBE socket reconnected — joining room:",
        roomId
      );


      joinRoom(
        roomId,
        name
      );


      setTimeout(() => {

        socket.emit(
          "profile-update",
          {
            roomId,
            name,
            avatar:
              profile.avatar ||
              ""
          }
        );

      }, 100);

    }


    socket.on(
      "connect",
      handleReconnect
    );


    /*
      =========================
      CLEANUP
      =========================
    */

    return () => {

      mounted = false;


      socket.off(
        "users",
        handleUsers
      );

      socket.off(
        "presence",
        applyPresence
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

      socket.off(
        "connect",
        handleReconnect
      );


      clearTimeout(
        profileUpdateTimer
      );

    };

  }, [
    roomId,
    name,
    profile.avatar
  ]);


  /*
    =========================
    VIDEO CONTROL
    =========================
  */

  function handleVideoControl(
    action:
      | "play"
      | "pause",
    position: number
  ) {

    sendVideoControl(
      roomId,
      action,
      position
    );

  }


  /*
    =========================
    VIDEO POSITION
    =========================
  */

  function handleVideoPosition(
    position: number
  ) {

    sendVideoPosition(
      roomId,
      position
    );

  }


  /*
    =========================
    PROFILE
    =========================
  */

  function handleProfileSave(
    nextProfile: Profile
  ) {

    onProfileChange(
      nextProfile
    );


    socket.emit(
      "profile-update",
      {
        roomId,
        name:
          nextProfile.name,
        avatar:
          nextProfile.avatar ||
          ""
      }
    );

  }


  /*
    =========================
    UI
    =========================
  */

  return (

    <div className="watch-room">


      {/* HEADER */}

      <div className="watch-header">

        <div className="watch-header-left">

          <div className="watch-room-title">
            {roomId}
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

        </div>


        <ProfileModal
          profile={profile}
          onSave={
            handleProfileSave
          }
        />

      </div>


      {/* VIDEO */}

      <div className="watch-video">

        <VideoPlayer
          videoUrl={videoUrl}
          initialPosition={
            initialPosition
          }
          initialAction={
            initialAction
          }
          remoteControl={
            remoteControl
          }
          onControl={
            handleVideoControl
          }
          onPosition={
            handleVideoPosition
          }
        />

      </div>


      {/* REACTIONS */}

      {reactionsOnScreen.length >
        0 && (

        <div className="watch-reactions">

          {reactionsOnScreen.map(
            reaction => (

              <div
                key={
                  String(
                    reaction.id
                  )
                }
                className="watch-reaction"
              >

                {reaction.emoji ||
                  "❤️"}

              </div>

            )
          )}

        </div>

      )}


      {/* CHAT */}

      <Chat
        roomId={roomId}
        presence={presence}
      />

    </div>

  );

}


export default WatchRoom;
