import { io } from "socket.io-client";

/*
==================================================
SERVER
==================================================
*/

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  "http://localhost:3001";

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"]
});


/*
==================================================
TYPES
==================================================
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


export type RemoteVideoControl = {
  action: VideoAction;
  position: number;
  id: number;
};


/*
==================================================
LOCAL STORAGE
==================================================
*/

const USER_ID_KEY =
  "vibe-user-id";

const USER_PROFILE_KEY =
  "vibe-profile";


function getSavedUserId(): string {
  try {
    return (
      localStorage.getItem(USER_ID_KEY) ||
      ""
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
==================================================
PROFILE
==================================================
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

    const profile =
      JSON.parse(raw);

    return {
      name: String(
        profile?.name || ""
      ),
      avatar: String(
        profile?.avatar || ""
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
    // localStorage unavailable
  }
}


/*
==================================================
CURRENT USER
==================================================
*/

let currentUser:
  VibeUser | null = null;


export function getCurrentUser() {
  return currentUser;
}


/*
==================================================
REGISTER
==================================================
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
      .slice(0, 40) ||
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
==================================================
USER REGISTERED
==================================================
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
==================================================
SOCKET CONNECT
==================================================
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
==================================================
FRIENDS DATA
==================================================
*/

socket.on(
  "friends-data",
  (data: FriendsData) => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-friends-data",
        {
          detail: {
            friends:
              data?.friends || [],

            incoming:
              data?.incoming || [],

            outgoing:
              data?.outgoing || []
          }
        }
      )
    );
  }
);


/*
==================================================
SEARCH
==================================================
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
==================================================
FRIEND REQUESTS
==================================================
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
==================================================
FRIEND EVENTS
==================================================
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
==================================================
ROOM
==================================================
*/

export function joinRoom(
  roomId: string,
  userName?: string
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
==================================================
VIDEO CONTROL
==================================================
*/

export function sendVideoControl(
  roomId: string,
  action: VideoAction,
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
==================================================
VIDEO EVENTS
==================================================
*/

socket.on(
  "video-control",
  (data: {
    action: VideoAction;
    position: number;
    id: number;
    source?: string;
  }) => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-video-control",
        {
          detail: data
        }
      )
    );
  }
);


socket.on(
  "video-position",
  (data: {
    position: number;
    id: number;
    source?: string;
  }) => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-video-position",
        {
          detail: data
        }
      )
    );
  }
);


/*
==================================================
ROOM STATE
==================================================
*/

socket.on(
  "room-state",
  data => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-room-state",
        {
          detail:
            data
        }
      )
    );
  }
);


socket.on(
  "room-not-found",
  () => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-room-not-found"
      )
    );
  }
);


socket.on(
  "users",
  (count: number) => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-users",
        {
          detail:
            count
        }
      )
    );
  }
);


/*
==================================================
PRESENCE
==================================================
*/

socket.on(
  "presence",
  data => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-presence",
        {
          detail:
            data
        }
      )
    );
  }
);


/*
==================================================
REACTIONS
==================================================
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


socket.on(
  "reaction",
  data => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-reaction",
        {
          detail:
            data
        }
      )
    );
  }
);


/*
==================================================
CHAT
==================================================
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


socket.on(
  "chat-message",
  data => {

    window.dispatchEvent(
      new CustomEvent(
        "vibe-chat-message",
        {
          detail:
            data
        }
      )
    );
  }
);


/*
==================================================
PROFILE UPDATE
==================================================
*/

export function updateProfile(
  roomId: string,
  profile: {
    name: string;
    avatar: string;
  }
) {
  saveProfileLocally(
    profile
  );

  socket.emit(
    "profile-update",
    {
      roomId,
      name:
        profile.name,
      avatar:
        profile.avatar
    }
  );
}
