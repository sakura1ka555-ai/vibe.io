import { io } from "socket.io-client";


/*
  =========================
  SERVER
  =========================
*/

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  "https://vibe-server-la2z.onrender.com";


export const socket =
  io(
    SERVER_URL,
    {
      autoConnect: true
    }
  );


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


/*
  =========================
  LOCAL USER ID
  =========================
*/

const USER_ID_KEY =
  "vibe-user-id";


const USER_PROFILE_KEY =
  "vibe-profile";


function getSavedUserId() {

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

    // localStorage unavailable

  }

}


/*
  =========================
  PROFILE STORAGE
  =========================
*/

export function getSavedProfile() {

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


    const profile =
      JSON.parse(
        raw
      );


    return {

      name:
        String(
          profile?.name ||
          ""
        ),

      avatar:
        String(
          profile?.avatar ||
          ""
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
      JSON.stringify(
        profile
      )
    );

  } catch {

    // localStorage unavailable

  }

}


/*
  =========================
  CURRENT USER
  =========================
*/

let currentUser:
  VibeUser | null =
  null;


export function getCurrentUser() {

  return currentUser;

}


/*
  =========================
  REGISTER
  =========================
*/

export function registerUser(
  profile?: {
    name?: string;
    avatar?: string;
  }
) {

  const savedProfile =
    getSavedProfile();


  const name =
    String(
      profile?.name ??
      savedProfile.name ??
      "Guest"
    )
      .trim()
      .slice(
        0,
        40
      ) ||
    "Guest";


  const avatar =
    String(
      profile?.avatar ??
      savedProfile.avatar ??
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
  (data: {
    user: VibeUser;
  }) => {

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
      "🆔 VIBE ID:",
      data.user.id
    );

  }
);


/*
  =========================
  REGISTER WHEN CONNECTED
  =========================
*/

socket.on(
  "connect",
  () => {

    console.log(
      "🟢 socket connected:",
      socket.id
    );


    registerUser();

  }
);


/*
  =========================
  RECONNECT
  =========================
*/

socket.on(
  "disconnect",
  reason => {

    console.log(
      "🔴 socket disconnected:",
      reason
    );

  }
);


/*
  =========================
  FRIENDS DATA
  =========================
*/

socket.on(
  "friends-data",
  (data: FriendsData) => {

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
  SEARCH
  =========================
*/

export function searchUsers(
  query: string
) {

  socket.emit(
    "search-users",
    {
      query
    }
  );

}


socket.on(
  "user-search-results",
  (data: {
    users: VibeUser[];
  }) => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-user-search-results",
        {
          detail:
            data?.users || []
        }
      )
    );

  }
);


/*
  =========================
  FRIEND REQUEST
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

  socket.emit(
    "join-room",
    {

      roomId,

      userName

    }
  );

}


/*
  =========================
  VIDEO
  =========================
*/

export function sendVideoControl(
  roomId: string,
  action:
    | "play"
    | "pause",
  position: number
) {

  socket.emit(
    "video-control",
    {

      roomId,

      action,

      position

    }
  );

}


export function sendVideoPosition(
  roomId: string,
  position: number
) {

  socket.emit(
    "video-position",
    {

      roomId,

      position

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

  socket.emit(
    "chat-message",
    {

      roomId,

      text

    }
  );

}
