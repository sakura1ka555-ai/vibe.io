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
  sendVideoPosition,
  sendReaction
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


type RemoteControl = {
  action: "play" | "pause";
  position: number;
  id: number;
} | null;


const REACTIONS = [
  "❤️",
  "😂",
  "🔥",
  "👍",
  "👏"
];


function normalizePresence(
  value: unknown
): PresenceUser[] {

  if (Array.isArray(value)) {
    return value as PresenceUser[];
  }


  if (
    value &&
    typeof value === "object"
  ) {

    const data =
      value as {
        users?: unknown;
        presence?: unknown;
        participants?: unknown;
      };


    if (Array.isArray(data.presence)) {
      return data.presence as PresenceUser[];
    }


    if (Array.isArray(data.users)) {
      return data.users as PresenceUser[];
    }


    if (
      Array.isArray(
        data.participants
      )
    ) {

      return data.participants as PresenceUser[];
    }
  }


  return [];
}


function getInitial(
  name: string
): string {

  return (
    String(name || "Guest")
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "G"
  );
}


function WatchRoom({
  name,
  videoUrl,
  roomId,
  profile,
  onProfileChange
}: Props) {

  const [
    presence,
    setPresence
  ] = useState<PresenceUser[]>([]);


  const [
    reactionsOnScreen,
    setReactionsOnScreen
  ] = useState<Reaction[]>([]);


  const [
    initialPosition,
    setInitialPosition
  ] = useState(0);


  const [
    initialAction,
    setInitialAction
  ] = useState<
    "play" | "pause"
  >("pause");


  const [
    remoteControl,
    setRemoteControl
  ] = useState<RemoteControl>(null);


  const [
    profileOpen,
    setProfileOpen
  ] = useState(false);


  const [
    inviteOpen,
    setInviteOpen
  ] = useState(false);


  const [
    copied,
    setCopied
  ] = useState(false);


  const userIdRef =
    useRef<string>("");


  const reactionCounter =
    useRef(0);


  /*
  ==================================================
  USER ID
  ==================================================
  */

  useEffect(() => {

    let userId =
      localStorage.getItem(
        "vibe-user-id"
      );


    if (!userId) {

      userId =
        crypto.randomUUID();

      localStorage.setItem(
        "vibe-user-id",
        userId
      );
    }


    userIdRef.current =
      userId;

  }, []);


  /*
  ==================================================
  ROOM PRESENCE + SOCKET
  ==================================================
  */

  useEffect(() => {

    let active = true;


    /*
    ================================================
    PRESENCE
    ================================================
    */

    const handlePresence =
      (value: unknown) => {

        if (!active) {
          return;
        }


        const people =
          normalizePresence(
            value
          );


        console.log(
          "👥 VIBE PRESENCE:",
          people
        );


        setPresence(
          people
        );
      };


    /*
    ================================================
    USERS
    ================================================
    
    Это оставляем как дополнительный
    listener для совместимости.
    
    Сам интерфейс теперь считает людей
    непосредственно из presence.
    */

    const handleUsers =
      (value: unknown) => {

        console.log(
          "👥 VIBE USERS:",
          value
        );
      };


    /*
    ================================================
    ROOM STATE
    ================================================
    */

    const handleRoomState =
      (data: unknown) => {

        if (
          !data ||
          typeof data !== "object"
        ) {
          return;
        }


        const room =
          data as {
            playback?: {
              action?: string;
              position?: number;
            };
          };


        const playback =
          room.playback;


        if (!playback) {
          return;
        }


        const position =
          Number(
            playback.position
          );


        setInitialPosition(
          Number.isFinite(position)
            ? Math.max(
                0,
                position
              )
            : 0
        );


        setInitialAction(
          playback.action === "play"
            ? "play"
            : "pause"
        );

      };


    /*
    ================================================
    REMOTE VIDEO CONTROL
    ================================================
    */

    const handleRemoteControl =
      (data: unknown) => {

        if (
          !data ||
          typeof data !== "object"
        ) {
          return;
        }


        const control =
          data as {
            action?: string;
            position?: number;
            id?: number;
          };


        if (
          control.action !== "play" &&
          control.action !== "pause"
        ) {

          return;
        }


        const position =
          Number(
            control.position
          );


        const id =
          Number(
            control.id
          );


        setRemoteControl({
          action:
            control.action,
          position:
            Number.isFinite(position)
              ? Math.max(
                  0,
                  position
                )
              : 0,
          id:
            Number.isFinite(id)
              ? id
              : Date.now()
        });

      };


    /*
    ================================================
    REACTION
    ================================================
    */

    const handleReaction =
      (reaction: unknown) => {

        if (
          !reaction ||
          typeof reaction !== "object"
        ) {
          return;
        }


        const data =
          reaction as Reaction;


        if (!data.emoji) {
          return;
        }


        const item: Reaction = {
          ...data,
          id:
            data.id ??
            `${Date.now()}-${++reactionCounter.current}`
        };


        setReactionsOnScreen(
          previous => [
            ...previous,
            item
          ]
        );


        window.setTimeout(() => {

          setReactionsOnScreen(
            previous =>
              previous.filter(
                current =>
                  current.id !==
                  item.id
              )
          );

        }, 2500);
      };


    /*
    ================================================
    REGISTER LISTENERS FIRST
    ================================================
    */

    socket.on(
      "presence",
      handlePresence
    );


    socket.on(
      "users",
      handleUsers
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
    ================================================
    PROFILE
    ================================================
    */

    const sendProfile =
      () => {

        socket.emit(
          "profile-update",
          {
            roomId,
            name:
              profile.name ||
              name ||
              "Guest",
            avatar:
              profile.avatar ||
              ""
          }
        );

      };


    /*
    ================================================
    JOIN ROOM
    ================================================
    
    Сначала join.
    Потом profile-update.
    */

    joinRoom(
      roomId,
      profile.name ||
        name ||
        "Guest"
    );


    const profileTimer =
      window.setTimeout(
        sendProfile,
        300
      );


    /*
    ================================================
    RECONNECT
    ================================================
    */

    const handleConnect =
      () => {

        console.log(
          "🔄 Rejoining VIBE room:",
          roomId
        );


        joinRoom(
          roomId,
          profile.name ||
            name ||
            "Guest"
        );


        window.setTimeout(
          sendProfile,
          300
        );

      };


    socket.on(
      "connect",
      handleConnect
    );


    /*
    ================================================
    CLEANUP
    ================================================
    */

    return () => {

      active = false;


      window.clearTimeout(
        profileTimer
      );


      socket.off(
        "presence",
        handlePresence
      );


      socket.off(
        "users",
        handleUsers
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
        handleConnect
      );

    };

  }, [
    roomId,
    name,
    profile.name,
    profile.avatar
  ]);


  /*
  ==================================================
  VIDEO
  ==================================================
  */

  function handleVideoControl(
    action: "play" | "pause",
    position: number
  ) {

    sendVideoControl(
      roomId,
      action,
      position
    );

  }


  function handleVideoSeek(
    position: number
  ) {

    sendVideoPosition(
      roomId,
      position
    );

  }


  function handleVideoPosition(
    position: number
  ) {

    setInitialPosition(
      position
    );

  }


  /*
  ==================================================
  PROFILE
  ==================================================
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
          nextProfile.name ||
          "Guest",
        avatar:
          nextProfile.avatar ||
          ""
      }
    );


    setProfileOpen(
      false
    );

  }


  /*
  ==================================================
  REACTION
  ==================================================
  */

  function handleReaction(
    emoji: string
  ) {

    sendReaction(
      roomId,
      emoji
    );

  }


  /*
  ==================================================
  INVITE
  ==================================================
  */

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomId)}`
      : "";


  async function copyInviteLink() {

    if (!inviteLink) {
      return;
    }


    try {

      await navigator.clipboard.writeText(
        inviteLink
      );


      setCopied(
        true
      );


      window.setTimeout(() => {

        setCopied(
          false
        );

      }, 1800);

    } catch {

      const textarea =
        document.createElement(
          "textarea"
        );


      textarea.value =
        inviteLink;


      textarea.style.position =
        "fixed";


      textarea.style.opacity =
        "0";


      document.body.appendChild(
        textarea
      );


      textarea.select();


      try {

        document.execCommand(
          "copy"
        );


        setCopied(
          true
        );


        window.setTimeout(() => {

          setCopied(
            false
          );

        }, 1800);

      } finally {

        document.body.removeChild(
          textarea
        );

      }

    }

  }


  async function shareInviteLink() {

    if (!inviteLink) {
      return;
    }


    if (
      navigator.share
    ) {

      try {

        await navigator.share({
          title:
            `VIBE — ${name}`,
          text:
            `Присоединяйся к комнате ${roomId}`,
          url:
            inviteLink
        });

      } catch {
        // Пользователь закрыл share.
      }


      return;
    }


    await copyInviteLink();

  }


  /*
  ==================================================
  AVATAR
  ==================================================
  */

  const avatar =
    profile.avatar ||
    "";


  const avatarInitial =
    getInitial(
      profile.name ||
        name ||
        "Guest"
    );


  /*
  ==================================================
  VIEWER COUNT
  ==================================================
  */

  const viewerCount =
    Math.max(
      1,
      presence.length
    );


  /*
  ==================================================
  RENDER
  ==================================================
  */

  return (
    <div className="watch-room">

      <main className="watch-main">

        <header className="watch-header">

          <div className="watch-title-group">

            <div className="watch-label">
              VIBE
            </div>


            <h1>
              {name}
            </h1>


            <div className="watch-room-code">
              ROOM CODE: {roomId}
            </div>

          </div>


          <div className="watch-header-actions">

            <button
              type="button"
              className="invite-button"
              onClick={() =>
                setInviteOpen(true)
              }
            >

              <span className="invite-button-icon">
                ↗
              </span>


              <span>
                Invite
              </span>

            </button>


            <div className="watch-users">

              <span className="watch-users-dot">
                ●
              </span>


              <strong>
                {viewerCount}
              </strong>


              <span className="watch-users-label">
                watching
              </span>

            </div>


            <button
              type="button"
              className="watch-profile-button"
              onClick={() =>
                setProfileOpen(true)
              }
              aria-label="Open profile"
            >

              {avatar ? (

                <img
                  src={avatar}
                  alt=""
                />

              ) : (

                <span>
                  {avatarInitial}
                </span>

              )}

            </button>

          </div>

        </header>


        <div className="video-frame">

          <VideoPlayer
            videoUrl={videoUrl}
            initialPosition={
              initialPosition
            }
            initialAction={
              initialAction
            }
            onControl={
              handleVideoControl
            }
            onSeek={
              handleVideoSeek
            }
            onPosition={
              handleVideoPosition
            }
            remoteControl={
              remoteControl
            }
          />


          <div className="floating-reactions">

            {reactionsOnScreen.map(
              (reaction, index) => (

                <div
                  key={
                    String(
                      reaction.id ??
                      index
                    )
                  }
                  className="floating-reaction"
                  style={{
                    left:
                      `${18 + ((index * 17) % 68)}%`,
                    animationDelay:
                      `${(index % 3) * 0.08}s`
                  }}
                >

                  <span>
                    {reaction.emoji}
                  </span>


                  {reaction.user && (
                    <small>
                      {reaction.user}
                    </small>
                  )}

                </div>

              )
            )}

          </div>

        </div>


        <div className="reaction-bar">

          <div className="reaction-label">
            REACT
          </div>


          <div className="reaction-buttons">

            {REACTIONS.map(
              emoji => (

                <button
                  key={emoji}
                  type="button"
                  className="reaction-button"
                  onClick={() =>
                    handleReaction(
                      emoji
                    )
                  }
                  aria-label={
                    `Send ${emoji}`
                  }
                >
                  {emoji}
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


            <span>
              {initialAction === "play"
                ? "PLAYING"
                : "PAUSED"}
            </span>

          </div>


          <div className="watch-bottom-code">

            <span>
              ROOM
            </span>


            <strong>
              {roomId}
            </strong>

          </div>

        </div>

      </main>


      <aside className="watch-sidebar">

        <Chat
          roomId={roomId}
          presence={presence}
        />

      </aside>


      {profileOpen && (

        <ProfileModal
          profile={profile}
          onSave={
            handleProfileSave
          }
          onClose={() =>
            setProfileOpen(false)
          }
        />

      )}


      {inviteOpen && (

        <div
          className="invite-modal-backdrop"
          onClick={() =>
            setInviteOpen(false)
          }
        >

          <div
            className="invite-modal"
            onClick={event =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="invite-modal-close"
              onClick={() =>
                setInviteOpen(false)
              }
              aria-label="Close"
            >
              ×
            </button>


            <div className="invite-modal-label">
              VIBE ROOM
            </div>


            <h2>
              Invite to room
            </h2>


            <div className="invite-modal-description">
              Send this link to your friends
              so they can join the room.
            </div>


            <div className="invite-link-box">

              <div className="invite-link">
                {inviteLink}
              </div>


              <button
                type="button"
                className="invite-copy-button"
                onClick={
                  copyInviteLink
                }
              >
                {copied
                  ? "Copied"
                  : "Copy"}
              </button>

            </div>


            <button
              type="button"
              className="invite-share-button"
              onClick={
                shareInviteLink
              }
            >
              Share invite
            </button>


            <div className="invite-room-id">
              ROOM CODE:{" "}
              <strong>
                {roomId}
              </strong>
            </div>

          </div>

        </div>

      )}

    </div>
  );
}


export default WatchRoom;
