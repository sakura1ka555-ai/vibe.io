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


const USER_ID_KEY =
  "vibe-user-id";


function normalizePresence(
  data: unknown
): PresenceUser[] {

  if (Array.isArray(data)) {

    return data
      .filter(Boolean)
      .map((item: any) => ({
        id: String(
          item?.id ||
          ""
        ),

        name: String(
          item?.name ||
          "Guest"
        ),

        avatar: String(
          item?.avatar ||
          ""
        ),

        position:
          Number.isFinite(
            Number(
              item?.position
            )
          )
            ? Number(
                item.position
              )
            : 0,

        time: String(
          item?.time ||
          "00:00"
        ),

        state:
          item?.state ===
          "play"
            ? "play"
            : "pause"
      }))
      .filter(
        item => item.id
      );

  }


  /*
    На случай, если сервер
    когда-нибудь вернёт объект.
  */

  if (
    data &&
    typeof data ===
      "object"
  ) {

    const objectData =
      data as any;


    if (
      Array.isArray(
        objectData.users
      )
    ) {

      return normalizePresence(
        objectData.users
      );

    }


    if (
      Array.isArray(
        objectData.presence
      )
    ) {

      return normalizePresence(
        objectData.presence
      );

    }

  }


  return [];

}


function getSavedUserId() {

  try {

    const saved =
      localStorage.getItem(
        USER_ID_KEY
      );

    if (
      saved &&
      saved.trim()
    ) {

      return saved.trim();

    }

  } catch {
    // ignore
  }


  const id =
    `local-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;


  try {

    localStorage.setItem(
      USER_ID_KEY,
      id
    );

  } catch {
    // ignore
  }


  return id;

}


function WatchRoom({
  name,
  videoUrl,
  roomId,
  profile,
  onProfileChange
}: Props) {

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
    useRef(
      getSavedUserId()
    );


  /*
    =========================
    ROOM
    =========================
  */

  useEffect(() => {

    let mounted = true;


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


      const position =
        Number.isFinite(
          Number(
            state.position
          )
        )
          ? Number(
              state.position
            )
          : 0;


      const action =
        state.action ===
        "play"
          ? "play"
          : "pause";


      console.log(
        "🎬 VIBE ROOM STATE:",
        {
          action,
          position
        }
      );


      setInitialPosition(
        position
      );


      setInitialAction(
        action
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


      const position =
        Number.isFinite(
          Number(
            data.position
          )
        )
          ? Number(
              data.position
            )
          : 0;


      const action =
        data.action ===
        "play"
          ? "play"
          : "pause";


      console.log(
        "🎬 VIBE REMOTE CONTROL:",
        {
          action,
          position
        }
      );


      setRemoteControl({
        action,
        position,
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
      SOCKET LISTENERS
      =========================
    */

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
      JOIN ROOM
      =========================
    */

    console.log(
      "🚪 VIBE JOIN ROOM:",
      {
        roomId,
        name
      }
    );


    joinRoom(
      roomId,
      name
    );


    /*
      После входа сообщаем серверу
      актуальное имя и avatar.
    */

    const profileUpdateTimer =
      window.setTimeout(() => {

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
        "🔄 VIBE SOCKET RECONNECTED:",
        socket.id
      );


      /*
        После reconnect старый
        socket уже не находится
        в комнате.

        Поэтому снова входим.
      */

      joinRoom(
        roomId,
        name
      );


      window.setTimeout(() => {

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


    return () => {

      mounted = false;


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


      window.clearTimeout(
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

    const safePosition =
      Number.isFinite(
        Number(position)
      )
        ? Number(position)
        : 0;


    console.log(
      "🎬 VIBE SEND CONTROL:",
      {
        action,
        position:
          safePosition
      }
    );


    sendVideoControl(
      roomId,
      action,
      safePosition
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

    const safePosition =
      Number.isFinite(
        Number(position)
      )
        ? Number(position)
        : 0;


    sendVideoPosition(
      roomId,
      safePosition
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
    VIEWER COUNT
    =========================
  */

  const users =
    presence.length;


  /*
    =========================
    UI
    =========================
  */

  return (

    <div className="watch-room">


      {/* =========================
          HEADER
      ========================= */}

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


      {/* =========================
          VIDEO
      ========================= */}

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


      {/* =========================
          REACTIONS
      ========================= */}

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


      {/* =========================
          CHAT
      ========================= */}

      <Chat
        roomId={roomId}
        presence={presence}
      />


    </div>

  );

}


export default WatchRoom;
