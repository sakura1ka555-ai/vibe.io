import {
  useCallback,
  useEffect,
  useState
} from "react";

import Chat from "./Chat";
import VideoPlayer from "./VideoPlayer";
import ProfileModal, {
  ProfileData
} from "./ProfileModal";

import {
  socket,
  joinRoom
} from "../socket";


type PresenceUser = {
  id: string;
  name: string;
  position: number;
  time: string;
  state?: "play" | "pause";
  avatar?: string;
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
  profile: ProfileData;
  onProfileChange: (
    profile: ProfileData
  ) => void;
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
  roomId,
  profile,
  onProfileChange
}: Props) {

  const userName =
    profile.name ||
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


  const [inviteOpen, setInviteOpen] =
    useState(false);


  const [inviteCopied, setInviteCopied] =
    useState(false);


  const [profileOpen, setProfileOpen] =
    useState(false);


  const inviteUrl =
    `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;


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


    /*
      Передаём серверу
      наш профиль.
    */

    window.setTimeout(
      () => {

        socket.emit(
          "profile-update",
          {
            roomId,

            name:
              userName,

            avatar:
              profile.avatar || ""
          }
        );

      },
      100
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
    userName,
    profile.avatar
  ]);


  /*
    =========================
    PROFILE UPDATE
  =========================
  */

  function saveProfile(
    newProfile: ProfileData
  ) {

    onProfileChange(
      newProfile
    );


    setProfileOpen(
      false
    );


    socket.emit(
      "profile-update",
      {

        roomId,

        name:
          newProfile.name,

        avatar:
          newProfile.avatar

      }
    );

  }


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
        position:
          number
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
    COPY INVITE
  =========================
  */

  async function copyInviteLink() {

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

      const textarea =
        document.createElement(
          "textarea"
        );


      textarea.value =
        inviteUrl;


      textarea.style.position =
        "fixed";


      textarea.style.opacity =
        "0";


      document.body.appendChild(
        textarea
      );


      textarea.select();


      document.execCommand(
        "copy"
      );


      textarea.remove();


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

    }

  }


  /*
    =========================
    SHARE
  =========================
  */

  async function shareInviteLink() {

    const shareText =
      `🎬 Я смотрю в VIBE\nПрисоединяйся к комнате ${roomId}`;


    const telegramWebApp =
      window.Telegram?.WebApp;


    const telegramShareUrl =
      `https://t.me/share/url?url=${encodeURIComponent(
        inviteUrl
      )}&text=${encodeURIComponent(
        shareText
      )}`;


    if (
      telegramWebApp?.openTelegramLink
    ) {

      telegramWebApp.openTelegramLink(
        telegramShareUrl
      );

      return;

    }


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

        // share cancelled

      }

    }


    await copyInviteLink();

  }


  /*
    =========================
    CLOSE INVITE
  =========================
  */

  function closeInvite() {

    setInviteOpen(
      false
    );


    setInviteCopied(
      false
    );

  }


  const profileLetter =
    (
      profile.name ||
      "G"
    )
      .charAt(0)
      .toUpperCase();


  /*
    =========================
    UI
  =========================
    */

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


            {/* PROFILE */}

            <button
              type="button"
              className="watch-profile-button"
              onClick={() =>
                setProfileOpen(true)
              }
            >

              {profile.avatar ? (

                <img
                  src={profile.avatar}
                  alt=""
                  className="watch-profile-avatar"
                />

              ) : (

                <span className="watch-profile-letter">
                  {profileLetter}
                </span>

              )}

              <span className="watch-profile-name">
                {profile.name}
              </span>

            </button>


            {/* INVITE */}

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
                INVITE
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


      {/* =========================
          PROFILE MODAL
      ========================= */}

      {profileOpen && (

        <ProfileModal

          profile={
            profile
          }

          onSave={
            saveProfile
          }

          onClose={() =>
            setProfileOpen(
              false
            )
          }

        />

      )}


      {/* =========================
          INVITE MODAL
      ========================= */}

      {inviteOpen && (

        <div
          className="invite-modal-backdrop"
          onClick={
            closeInvite
          }
        >

          <div
            className="invite-modal"
            onClick={
              event =>
                event.stopPropagation()
            }
          >

            <button
              type="button"
              className="invite-modal-close"
              onClick={
                closeInvite
              }
            >
              ×
            </button>


            <div className="invite-modal-label">
              INVITE TO VIBE
            </div>


            <h2>
              Пригласи друзей
            </h2>


            <p className="invite-modal-description">
              Отправь ссылку другу,
              чтобы он сразу попал
              в эту комнату.
            </p>


            <div className="invite-link-box">

              <div className="invite-link">
                {inviteUrl}
              </div>

            </div>


            <button
              type="button"
              className="invite-copy-button"
              onClick={
                copyInviteLink
              }
            >

              {inviteCopied
                ? "✓ LINK COPIED"
                : "COPY LINK"
              }

            </button>


            <button
              type="button"
              className="invite-share-button"
              onClick={
                shareInviteLink
              }
            >
              ↗ SHARE
            </button>


            <div className="invite-room-id">

              ROOM&nbsp;&nbsp;

              <strong>
                {roomId}
              </strong>

            </div>


          </div>

        </div>

      )}


    </main>

  );

}


export default WatchRoom;
