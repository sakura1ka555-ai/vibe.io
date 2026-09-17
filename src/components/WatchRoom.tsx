import {
  useCallback,
  useEffect,
  useRef,
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


type VibeStatsStorage = {
  totalSeconds: number;
  activity: Record<string, number>;
  activeSince: number | null;
  lastHeartbeat: number | null;
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


const VIBE_STATS_PREFIX =
  "vibe-stats-v2-";


const VIBE_USER_ID_KEY =
  "vibe-user-id";


function getTodayKey() {
  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getDateKey(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function createUserId() {
  return (
    `${Date.now().toString(36)}-` +
    `${Math.random()
      .toString(36)
      .slice(2, 10)}`
  );
}


function getUserId() {
  const existing =
    localStorage.getItem(
      VIBE_USER_ID_KEY
    );

  if (existing) {
    return existing;
  }

  const id =
    createUserId();

  localStorage.setItem(
    VIBE_USER_ID_KEY,
    id
  );

  return id;
}


function getStorageKey(
  userId: string
) {
  return (
    `${VIBE_STATS_PREFIX}${userId}`
  );
}


function createEmptyStats(): VibeStatsStorage {
  return {
    totalSeconds: 0,
    activity: {},
    activeSince: null,
    lastHeartbeat: null
  };
}


function loadStats(
  userId: string
): VibeStatsStorage {

  try {

    const raw =
      localStorage.getItem(
        getStorageKey(userId)
      );

    if (!raw) {
      return createEmptyStats();
    }

    const parsed =
      JSON.parse(raw);

    return {
      totalSeconds:
        Number(
          parsed.totalSeconds
        ) || 0,

      activity:
        parsed.activity &&
        typeof parsed.activity === "object"
          ? parsed.activity
          : {},

      activeSince:
        typeof parsed.activeSince === "number"
          ? parsed.activeSince
          : null,

      lastHeartbeat:
        typeof parsed.lastHeartbeat === "number"
          ? parsed.lastHeartbeat
          : null
    };

  } catch {

    return createEmptyStats();

  }
}


function saveStats(
  userId: string,
  stats: VibeStatsStorage
) {

  try {

    localStorage.setItem(
      getStorageKey(userId),
      JSON.stringify(stats)
    );

  } catch {

    // localStorage недоступен
    // или переполнен

  }
}


function getLastSevenDays() {

  const result: {
    key: string;
    label: string;
  }[] = [];

  const labels = [
    "SUN",
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT"
  ];

  const now =
    new Date();

  for (
    let index = 6;
    index >= 0;
    index--
  ) {

    const date =
      new Date(now);

    date.setDate(
      now.getDate() - index
    );

    result.push({
      key:
        getDateKey(date),

      label:
        labels[
          date.getDay()
        ]
    });

  }

  return result;
}


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


  /*
    =========================
    VIBE TIME
    =========================
  */

  const userIdRef =
    useRef<string | null>(null);


  if (!userIdRef.current) {
    userIdRef.current =
      getUserId();
  }


  const userId =
    userIdRef.current;


  const statsRef =
    useRef<VibeStatsStorage>(
      loadStats(userId)
    );


  const sessionStartedRef =
    useRef<number | null>(null);


  const lastTickRef =
    useRef<number>(
      Date.now()
    );


  const [vibeTimeSeconds, setVibeTimeSeconds] =
    useState(
      statsRef.current.totalSeconds
    );


  const [activity, setActivity] =
    useState<Record<string, number>>(
      statsRef.current.activity
    );


  function addElapsedTime(
    seconds: number
  ) {

    if (
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {
      return;
    }


    const rounded =
      Math.max(
        0,
        Math.floor(seconds)
      );


    if (rounded <= 0) {
      return;
    }


    const today =
      getTodayKey();


    const currentStats =
      statsRef.current;


    currentStats.totalSeconds +=
      rounded;


    currentStats.activity[today] =
      (
        currentStats.activity[today] ||
        0
      ) + rounded;


    saveStats(
      userId,
      currentStats
    );


    setVibeTimeSeconds(
      currentStats.totalSeconds
    );


    setActivity({
      ...currentStats.activity
    });

  }


  function startVibeSession() {

    const now =
      Date.now();


    sessionStartedRef.current =
      now;


    lastTickRef.current =
      now;


    statsRef.current.activeSince =
      now;


    statsRef.current.lastHeartbeat =
      now;


    saveStats(
      userId,
      statsRef.current
    );

  }


  function stopVibeSession() {

    const startedAt =
      sessionStartedRef.current;


    if (
      startedAt !== null
    ) {

      const now =
        Date.now();


      const seconds =
        (
          now - startedAt
        ) / 1000;


      addElapsedTime(
        seconds
      );

    }


    sessionStartedRef.current =
      null;


    statsRef.current.activeSince =
      null;


    statsRef.current.lastHeartbeat =
      null;


    saveStats(
      userId,
      statsRef.current
    );

  }


  useEffect(() => {

    const stored =
      statsRef.current;


    if (
      stored.activeSince !== null &&
      stored.lastHeartbeat !== null
    ) {

      const now =
        Date.now();


      const missedSeconds =
        Math.min(
          10,
          Math.max(
            0,
            (
              now -
              stored.lastHeartbeat
            ) / 1000
          )
        );


      if (
        missedSeconds > 0
      ) {

        addElapsedTime(
          missedSeconds
        );

      }

    }


    startVibeSession();


    const interval =
      window.setInterval(
        () => {

          const now =
            Date.now();


          const previous =
            lastTickRef.current;


          const elapsed =
            (
              now -
              previous
            ) / 1000;


          lastTickRef.current =
            now;


          if (
            sessionStartedRef.current === null
          ) {
            return;
          }


          if (
            elapsed > 0 &&
            elapsed < 10
          ) {

            addElapsedTime(
              elapsed
            );

          }


          statsRef.current.lastHeartbeat =
            now;


          saveStats(
            userId,
            statsRef.current
          );

        },
        1000
      );


    function handleVisibilityChange() {

      if (
        document.visibilityState ===
        "hidden"
      ) {

        stopVibeSession();

      } else {

        startVibeSession();

      }

    }


    function handlePageHide() {

      stopVibeSession();

    }


    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );


    window.addEventListener(
      "pagehide",
      handlePageHide
    );


    return () => {

      window.clearInterval(
        interval
      );


      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );


      window.removeEventListener(
        "pagehide",
        handlePageHide
      );


      stopVibeSession();

    };

  }, [
    userId
  ]);


  /*
    =========================
    LIVE ACTIVITY
    =========================
  */

  const weeklyActivity =
    getLastSevenDays().map(
      day =>
        activity[day.key] || 0
    );


  /*
    =========================
    INVITE
    =========================
  */

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

      if (
        typeof count === "number" &&
        Number.isFinite(count)
      ) {

        setUsers(
          Math.max(
            0,
            count
          )
        );

      }

    }


    function handlePresence(
      people: unknown
    ) {

      /*
        Сервер сейчас может отправлять
        числовое количество зрителей
        через event "presence".

        Chat ожидает массив пользователей,
        поэтому число нельзя передавать
        в setPresence().
      */

      if (
        Array.isArray(people)
      ) {

        setPresence(
          people as PresenceUser[]
        );

        return;

      }


      setPresence([]);

    }


    function handleRoomState(
      state: {
        action:
          "play" | "pause";

        position: number;
      }
    ) {

      if (
        !state
      ) {
        return;
      }


      setInitialAction(
        state.action === "play"
          ? "play"
          : "pause"
      );


      setInitialPosition(
        Number(
          state.position
        ) || 0
      );

    }


    function handleRemoteControl(
      data: {
        action:
          "play" | "pause";

        position: number;
      }
    ) {

      if (
        !data
      ) {
        return;
      }


      setRemoteControl({

        action:
          data.action === "play"
            ? "play"
            : "pause",

        position:
          Number(
            data.position
          ) || 0,

        id:
          Date.now()

      });

    }


    function handleVideoPosition(
      data: {
        position: number;
      }
    ) {

      if (
        !data
      ) {
        return;
      }


      setRemoteControl({

        action:
          initialAction,

        position:
          Number(
            data.position
          ) || 0,

        id:
          Date.now()

      });

    }


    function handleReaction(
      reaction: Reaction
    ) {

      if (
        !reaction
      ) {
        return;
      }


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
      "video-position",
      handleVideoPosition
    );


    socket.on(
      "reaction",
      handleReaction
    );


    joinRoom(
      roomId,
      userName
    );


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
        "video-position",
        handleVideoPosition
      );


      socket.off(
        "reaction",
        handleReaction
      );

    };

  }, [
    roomId,
    userName,
    profile.avatar,
    initialAction
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


      {profileOpen && (

        <ProfileModal

          profile={
            profile
          }

          vibeTimeSeconds={
            vibeTimeSeconds
          }

          weeklyActivity={
            weeklyActivity
          }

          isOnline={
            true
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
