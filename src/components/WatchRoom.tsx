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

  if (!value) {
    return [];
  }


  if (Array.isArray(value)) {
    return value as PresenceUser[];
  }


  if (
    typeof value === "object" &&
    value !== null
  ) {

    const data =
      value as {
        users?: unknown;
        presence?: unknown;
        participants?: unknown;
      };


    if (Array.isArray(data.users)) {
      return data.users as PresenceUser[];
    }


    if (Array.isArray(data.presence)) {
      return data.presence as PresenceUser[];
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
  name: string,
  avatar?: string
) {

  const trimmed =
    String(name || "Guest").trim();


  if (avatar) {
    return "";
  }


  return (
    trimmed
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

  const [users, setUsers] =
    useState(1);

  const [presence, setPresence] =
    useState<PresenceUser[]>([]);

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
  ROOM / SOCKET
  ==================================================
  */

  useEffect(() => {

    const applyPresence =
      (value: unknown) => {

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


        setUsers(
          Math.max(
            1,
            people.length
          )
        );
      };


    const handleUsers =
      (value: unknown) => {

        const count =
          Number(value);


        if (
          Number.isFinite(count)
        ) {

          setUsers(
            Math.max(
              1,
              count
            )
          );
        }
      };


    const handlePresence =
      (value: unknown) => {

        applyPresence(
          value
        );
      };


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


    /*
    ================================================
    JOIN
    ================================================
    */

    joinRoom(
      roomId,
      name
    );


    /*
    ================================================
    PROFILE IN ROOM
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


    const profileTimer =
      window.setTimeout(
        sendProfile,
        100
      );


    /*
    ================================================
    RECONNECT
    ================================================
    */

    const handleConnect =
      () => {

        joinRoom(
          roomId,
          profile.name ||
            name
        );


        window.setTimeout(
          sendProfile,
          100
        );
      };


    socket.on(
      "connect",
      handleConnect
    );


    return () => {

      window.clearTimeout(
        profileTimer
      );


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
  VIDEO CONTROL
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
  REACTIONS
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
        // Пользователь закрыл системное окно share.
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
        "Guest",
      avatar
    );


  /*
  ==================================================
  RENDER
  ==================================================
  */

  return (
    <div className="watch-room">

      {/* ==================================================
          MAIN
      ================================================== */}

      <main className="watch-main">

        {/* ==================================================
            HEADER
        ================================================== */}

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
                {users}
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


        {/* ==================================================
            VIDEO
        ================================================== */}

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


          {/* ==================================================
              FLOATING REACTIONS
          ================================================== */}

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


        {/* ==================================================
            REACTION BAR
        ================================================== */}

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


        {/* ==================================================
            BOTTOM STATUS
        ================================================== */}

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


      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <aside className="watch-sidebar">

        <Chat
          roomId={roomId}
          presence={presence}
        />

      </aside>


      {/* ==================================================
          PROFILE MODAL
      ================================================== */}

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


      {/* ==================================================
          INVITE MODAL
      ================================================== */}

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
