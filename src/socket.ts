import { io, Socket } from "socket.io-client";

/*
  =========================
  SERVER
  =========================
*/

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  "https://vibe-server-la2z.onrender.com";


/*
  =========================
  SOCKET
  =========================
*/

export const socket: Socket =
  io(SERVER_URL, {
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });


/*
  =========================
  TYPES
  =========================
*/

export type VibeUser = {
  id: string;
  name: string;
  avatar: string;
  createdAt: string;
};


export type FriendUser = VibeUser;


export type FriendRequest = {
  id: number;
  createdAt: string;
  userId: string;
  name: string;
  avatar: string;
};


export type FriendsData = {
  friends: FriendUser[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
};


export type VideoAction =
  | "play"
  | "pause";


export type VideoState = {
  action: VideoAction;
  position: number;
};


/*
  =========================
  STORAGE
  =========================
*/

const USER_ID_KEY =
  "vibe-user-id";

const USER_PROFILE_KEY =
  "vibe-profile";


function getSavedUserId(): string {

  try {

    return (
      localStorage.getItem(
        USER_ID_KEY
      ) || ""
    );

  } catch {

    return "";

  }

}


function saveUserId(
  userId: string
) {

  try {

    localStorage.setItem(
      USER_ID_KEY,
      userId
    );

  } catch {

    // ignore

  }

}


/*
  =========================
  PROFILE
  =========================
*/

export function getSavedProfile(): {
  name: string;
  avatar: string;
} {

  try {

    const raw =
      localStorage.getItem(
        USER_PROFILE_KEY
      );


    if (!raw) {

      return {
        name: "",
        avatar: ""
      };

    }


    const parsed =
      JSON.parse(raw);


    return {

      name:
        String(
          parsed?.name || ""
        ),

      avatar:
        String(
          parsed?.avatar || ""
        )

    };

  } catch {

    return {
      name: "",
      avatar: ""
    };

  }

}


export function saveProfileLocally(
  profile: {
    name: string;
    avatar: string;
  }
) {

  try {

    localStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify(profile)
    );

  } catch {

    // ignore

  }

}


/*
  =========================
  CURRENT USER
  =========================
*/

let currentUser:
  VibeUser | null = null;


export function getCurrentUser():
  VibeUser | null {

  return currentUser;

}


/*
  =========================
  REGISTER USER
  =========================
*/

export function registerUser(
  profile?: {
    name?: string;
    avatar?: string;
  }
) {

  const saved =
    getSavedProfile();


  const name =
    String(
      profile?.name ??
      saved.name ??
      "Guest"
    )
      .trim()
      .slice(0, 40) ||
    "Guest";


  const avatar =
    String(
      profile?.avatar ??
      saved.avatar ??
      ""
    );


  socket.emit(
    "register-user",
    {
      userId:
        getSavedUserId(),

      name,

      avatar
    }
  );

}


/*
  =========================
  USER REGISTERED
  =========================
*/

socket.on(
  "user-registered",
  (
    data: {
      user: VibeUser;
    }
  ) => {

    if (!data?.user) {
      return;
    }


    currentUser =
      data.user;


    saveUserId(
      data.user.id
    );


    saveProfileLocally({

      name:
        data.user.name,

      avatar:
        data.user.avatar

    });


    window.dispatchEvent(
      new CustomEvent(
        "vibe-user-registered",
        {
          detail:
            data.user
        }
      )
    );


    console.log(
      "🆔 VIBE USER:",
      data.user.id
    );

  }
);


/*
  =========================
  CONNECTION
  =========================
*/

socket.on(
  "connect",
  () => {

    console.log(
      "🟢 VIBE socket connected:",
      socket.id
    );


    registerUser();

  }
);


socket.on(
  "disconnect",
  reason => {

    console.log(
      "🔴 VIBE socket disconnected:",
      reason
    );

  }
);


socket.on(
  "connect_error",
  error => {

    console.error(
      "❌ VIBE socket error:",
      error
    );

  }
);


/*
  =========================
  FRIENDS
  =========================
*/

socket.on(
  "friends-data",
  (
    data: FriendsData
  ) => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-friends-data",
        {
          detail:
            data
        }
      )
    );

  }
);


/*
  =========================
  SEARCH USERS
  =========================
*/

export function searchUsers(
  query: string
) {

  socket.emit(
    "search-users",
    {
      query:
        query.trim()
    }
  );

}


socket.on(
  "user-search-results",
  (
    data: {
      users: VibeUser[];
    }
  ) => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-user-search-results",
        {
          detail:
            Array.isArray(
              data?.users
            )
              ? data.users
              : []
        }
      )
    );

  }
);


/*
  =========================
  FRIEND REQUESTS
  =========================
*/

export function sendFriendRequest(
  userId: string
) {

  socket.emit(
    "friend-request",
    {
      userId
    }
  );

}


export function acceptFriendRequest(
  requestId: number
) {

  socket.emit(
    "friend-accept",
    {
      requestId
    }
  );

}


export function declineFriendRequest(
  requestId: number
) {

  socket.emit(
    "friend-decline",
    {
      requestId
    }
  );

}


export function removeFriend(
  userId: string
) {

  socket.emit(
    "friend-remove",
    {
      userId
    }
  );

}


/*
  =========================
  FRIEND EVENTS
  =========================
*/

socket.on(
  "friend-success",
  data => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-friend-success",
        {
          detail:
            data
        }
      )
    );

  }
);


socket.on(
  "friend-error",
  data => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-friend-error",
        {
          detail:
            data
        }
      )
    );

  }
);


/*
  =========================
  ROOM
  =========================
*/

export function joinRoom(
  roomId: string,
  userName: string
) {

  const cleanRoomId =
    roomId
      .trim()
      .toUpperCase();


  const cleanName =
    userName
      .trim()
      .slice(0, 40) ||
    "Guest";


  if (!cleanRoomId) {
    return;
  }


  socket.emit(
    "join-room",
    {
      roomId:
        cleanRoomId,

      userName:
        cleanName
    }
  );

}


export function leaveRoom(
  roomId: string
) {

  socket.emit(
    "leave-room",
    {
      roomId
    }
  );

}


/*
  =========================
  PROFILE IN ROOM
  =========================
*/

export function updateRoomProfile(
  roomId: string,
  name: string,
  avatar: string
) {

  socket.emit(
    "profile-update",
    {
      roomId,

      name:
        name.trim().slice(0, 40) ||
        "Guest",

      avatar:
        avatar || ""
    }
  );

}


/*
  =========================
  VIDEO CONTROL
  =========================
*/

export function sendVideoControl(
  roomId: string,
  action: VideoAction,
  position: number
) {

  const safePosition =
    Number(position);


  socket.emit(
    "video-control",
    {

      roomId,

      action:
        action === "play"
          ? "play"
          : "pause",

      position:
        Number.isFinite(
          safePosition
        )
          ? Math.max(
              0,
              safePosition
            )
          : 0

    }
  );

}


/*
  =========================
  VIDEO SEEK
  =========================
*/

export function sendVideoSeek(
  roomId: string,
  position: number
) {

  const safePosition =
    Number(position);


  if (
    !Number.isFinite(
      safePosition
    )
  ) {

    return;

  }


  socket.emit(
    "video-seek",
    {

      roomId,

      position:
        Math.max(
          0,
          safePosition
        )

    }
  );

}


/*
  =========================
  VIDEO POSITION
  =========================
*/

export function sendVideoPosition(
  roomId: string,
  position: number
) {

  const safePosition =
    Number(position);


  if (
    !Number.isFinite(
      safePosition
    )
  ) {

    return;

  }


  socket.emit(
    "video-position",
    {

      roomId,

      position:
        Math.max(
          0,
          safePosition
        )

    }
  );

}


/*
  =========================
  REACTIONS
  =========================
*/

export function sendReaction(
  roomId: string,
  reaction: string
) {

  if (!reaction) {
    return;
  }


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
  CHAT
  =========================
*/

export function sendChatMessage(
  roomId: string,
  text: string
) {

  const message =
    text.trim();


  if (!message) {
    return;
  }


  socket.emit(
    "chat-message",
    {

      roomId,

      text:
        message.slice(
          0,
          1000
        )

    }
  );

}
