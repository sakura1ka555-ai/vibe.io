import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
import Database from "better-sqlite3";

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
});


/*
==================================================
DATABASE
==================================================
*/

const db = new Database("vibe.sqlite");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Guest',
    avatar TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, friend_id)
  );

  CREATE TABLE IF NOT EXISTS friend_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    UNIQUE(from_id, to_id)
  );

  CREATE INDEX IF NOT EXISTS idx_users_name
  ON users(name);

  CREATE INDEX IF NOT EXISTS idx_friendships_user
  ON friendships(user_id);

  CREATE INDEX IF NOT EXISTS idx_friend_requests_to
  ON friend_requests(to_id);

  CREATE INDEX IF NOT EXISTS idx_friend_requests_from
  ON friend_requests(from_id);
`);


/*
==================================================
USER HELPERS
==================================================
*/

function normalizeUserId(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}


function normalizeName(value) {
  return String(value || "Guest")
    .trim()
    .slice(0, 40) || "Guest";
}


function normalizeAvatar(value) {
  return String(value || "");
}


function createVibeId() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[
      Math.floor(Math.random() * chars.length)
    ];
  }

  return `VIBE-${code}`;
}


function createUniqueVibeId() {
  let id;

  do {
    id = createVibeId();
  } while (
    db.prepare(
      "SELECT id FROM users WHERE id = ?"
    ).get(id)
  );

  return id;
}


function getUser(userId) {
  const id = normalizeUserId(userId);

  if (!id) {
    return null;
  }

  return db.prepare(`
    SELECT
      id,
      name,
      avatar,
      created_at AS createdAt
    FROM users
    WHERE id = ?
  `).get(id);
}


function createUser(
  name = "Guest",
  avatar = ""
) {
  const id = createUniqueVibeId();

  const createdAt =
    new Date().toISOString();

  db.prepare(`
    INSERT INTO users
      (id, name, avatar, created_at)
    VALUES
      (?, ?, ?, ?)
  `).run(
    id,
    normalizeName(name),
    normalizeAvatar(avatar),
    createdAt
  );

  return getUser(id);
}


function updateUser(
  userId,
  name,
  avatar
) {
  const id = normalizeUserId(userId);

  if (!id) {
    return null;
  }

  db.prepare(`
    UPDATE users
    SET
      name = ?,
      avatar = ?
    WHERE id = ?
  `).run(
    normalizeName(name),
    normalizeAvatar(avatar),
    id
  );

  return getUser(id);
}


/*
==================================================
FRIENDS HELPERS
==================================================
*/

function areFriends(
  userA,
  userB
) {
  const a = normalizeUserId(userA);
  const b = normalizeUserId(userB);

  if (!a || !b) {
    return false;
  }

  const row = db.prepare(`
    SELECT id
    FROM friendships
    WHERE
      user_id = ?
      AND friend_id = ?
    LIMIT 1
  `).get(a, b);

  return Boolean(row);
}


function getFriends(userId) {
  const id = normalizeUserId(userId);

  if (!id) {
    return [];
  }

  return db.prepare(`
    SELECT
      u.id,
      u.name,
      u.avatar,
      u.created_at AS createdAt
    FROM friendships f
    JOIN users u
      ON u.id = f.friend_id
    WHERE f.user_id = ?
    ORDER BY
      u.name COLLATE NOCASE ASC
  `).all(id);
}


function getIncomingRequests(userId) {
  const id = normalizeUserId(userId);

  if (!id) {
    return [];
  }

  return db.prepare(`
    SELECT
      r.id,
      r.created_at AS createdAt,
      u.id AS userId,
      u.name,
      u.avatar
    FROM friend_requests r
    JOIN users u
      ON u.id = r.from_id
    WHERE
      r.to_id = ?
      AND r.status = 'pending'
    ORDER BY r.id DESC
  `).all(id);
}


function getOutgoingRequests(userId) {
  const id = normalizeUserId(userId);

  if (!id) {
    return [];
  }

  return db.prepare(`
    SELECT
      r.id,
      r.created_at AS createdAt,
      u.id AS userId,
      u.name,
      u.avatar
    FROM friend_requests r
    JOIN users u
      ON u.id = r.to_id
    WHERE
      r.from_id = ?
      AND r.status = 'pending'
    ORDER BY r.id DESC
  `).all(id);
}


function addFriendship(
  userA,
  userB
) {
  const a = normalizeUserId(userA);
  const b = normalizeUserId(userB);

  if (!a || !b || a === b) {
    return;
  }

  const transaction =
    db.transaction(() => {

      const now =
        new Date().toISOString();

      db.prepare(`
        INSERT OR IGNORE INTO friendships
          (user_id, friend_id, created_at)
        VALUES
          (?, ?, ?)
      `).run(
        a,
        b,
        now
      );

      db.prepare(`
        INSERT OR IGNORE INTO friendships
          (user_id, friend_id, created_at)
        VALUES
          (?, ?, ?)
      `).run(
        b,
        a,
        now
      );

    });

  transaction();
}


/*
==================================================
ROOMS
==================================================
*/

const rooms = new Map();


function createRoomObject(
  roomId,
  title,
  videoUrl
) {
  return {
    id: roomId,

    title:
      title ||
      `Комната ${roomId}`,

    videoUrl:
      videoUrl || "",

    users: 0,

    playback: {
      action: "pause",
      position: 0
    }
  };
}


/*
==================================================
HTTP
==================================================
*/

app.get(
  "/",
  async () => {
    return {
      app: "VIBE SERVER",
      status: "online"
    };
  }
);


/*
==================================================
 HEALTH
==================================================
*/

app.get(
  "/health",
  async () => {
    return {
      status: "ok",
      app: "VIBE SERVER",
      rooms: rooms.size,
      time: new Date().toISOString()
    };
  }
);


/*
==================================================
CREATE USER
==================================================
*/

app.post(
  "/users",
  async (
    request,
    reply
  ) => {

    const data =
      request.body || {};

    const name =
      normalizeName(data.name);

    const avatar =
      normalizeAvatar(data.avatar);

    if (avatar.length > 1500000) {
      return reply
        .code(400)
        .send({
          error:
            "Avatar is too large"
        });
    }

    const user =
      createUser(
        name,
        avatar
      );

    return {
      user
    };
  }
);


/*
==================================================
GET USER
==================================================
*/

app.get(
  "/users/:userId",
  async (
    request,
    reply
  ) => {

    const userId =
      normalizeUserId(
        request.params?.userId
      );

    const user =
      getUser(userId);

    if (!user) {
      return reply
        .code(404)
        .send({
          error:
            "User not found"
        });
    }

    return {
      user
    };
  }
);


/*
==================================================
SEARCH USERS
==================================================
*/

app.get(
  "/users/search",
  async (
    request
  ) => {

    const query =
      String(
        request.query?.q || ""
      )
        .trim()
        .slice(0, 40);

    if (!query) {
      return {
        users: []
      };
    }

    const like =
      `%${query}%`;

    const users =
      db.prepare(`
        SELECT
          id,
          name,
          avatar,
          created_at AS createdAt
        FROM users
        WHERE
          id LIKE ?
          OR name LIKE ?
        ORDER BY
          CASE
            WHEN id = ? THEN 0
            ELSE 1
          END,
          name COLLATE NOCASE ASC
        LIMIT 20
      `).all(
        like,
        like,
        query.toUpperCase()
      );

    return {
      users
    };
  }
);


/*
==================================================
CREATE ROOM
==================================================
*/

app.post(
  "/rooms",
  async (
    request,
    reply
  ) => {

    const data =
      request.body || {};

    const roomId =
      String(
        data.roomId || ""
      )
        .trim()
        .toUpperCase();

    const title =
      String(
        data.title ||
        `Комната ${roomId}`
      )
        .trim()
        .slice(0, 100);

    const videoUrl =
      String(
        data.videoUrl || ""
      )
        .trim();

    if (!roomId) {
      return reply
        .code(400)
        .send({
          error:
            "Room ID is required"
        });
    }

    if (roomId.length > 50) {
      return reply
        .code(400)
        .send({
          error:
            "Room ID is too long"
        });
    }

    if (videoUrl.length > 5000) {
      return reply
        .code(400)
        .send({
          error:
            "Video URL is too long"
        });
    }

    if (rooms.has(roomId)) {
      return reply
        .code(409)
        .send({
          error:
            "Room already exists"
        });
    }

    const room =
      createRoomObject(
        roomId,
        title,
        videoUrl
      );

    rooms.set(
      roomId,
      room
    );

    console.log(
      "🏠 room created:",
      roomId
    );

    return {
      room
    };
  }
);


/*
==================================================
GET ROOM
==================================================
*/

app.get(
  "/rooms/:roomId",
  async (
    request,
    reply
  ) => {

    const roomId =
      String(
        request.params?.roomId || ""
      )
        .trim()
        .toUpperCase();

    const room =
      rooms.get(roomId);

    console.log(
      "🔎 room request:",
      roomId
    );

    if (!room) {
      return reply
        .code(404)
        .send({
          error:
            "Room not found"
        });
    }

    return {
      room
    };
  }
);


/*
==================================================
SOCKET.IO
==================================================
*/

const io =
  new Server(
    app.server,
    {
      cors: {
        origin: "*",
        methods: [
          "GET",
          "POST"
        ]
      }
    }
  );


/*
==================================================
POSITION
==================================================
*/

function normalizePosition(
  seconds
) {
  const value =
    Number(seconds);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    value
  );
}


function formatPosition(
  seconds
) {
  const total =
    Math.floor(
      normalizePosition(
        seconds
      )
    );

  const minutes =
    Math.floor(
      total / 60
    );

  const secs =
    total % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(secs).padStart(2, "0")
  );
}


/*
==================================================
PRESENCE
==================================================
*/

function getPresence(
  roomId
) {
  const result = [];

  for (
    const connectedSocket
    of io.sockets.sockets.values()
  ) {

    if (
      connectedSocket.data.roomId !==
      roomId
    ) {
      continue;
    }

    result.push({
      id:
        connectedSocket.data.userId ||
        connectedSocket.id,

      name:
        connectedSocket.data.userName ||
        "Guest",

      avatar:
        connectedSocket.data.avatar ||
        "",

      position:
        normalizePosition(
          connectedSocket.data.position
        ),

      time:
        formatPosition(
          connectedSocket.data.position
        ),

      state:
        connectedSocket.data.videoState ||
        "pause"
    });
  }

  return result;
}


function emitPresence(
  roomId
) {
  io.to(roomId).emit(
    "presence",
    getPresence(roomId)
  );
}


/*
==================================================
FRIENDS SOCKET UPDATE
==================================================
*/

function emitFriendsUpdate(
  userId
) {

  if (!userId) {
    return;
  }

  for (
    const connectedSocket
    of io.sockets.sockets.values()
  ) {

    if (
      connectedSocket.data.userId !==
      userId
    ) {
      continue;
    }

    connectedSocket.emit(
      "friends-data",
      {
        friends:
          getFriends(userId),

        incoming:
          getIncomingRequests(userId),

        outgoing:
          getOutgoingRequests(userId)
      }
    );
  }
}


function isUserOnline(
  userId
) {

  for (
    const connectedSocket
    of io.sockets.sockets.values()
  ) {

    if (
      connectedSocket.data.userId ===
      userId
    ) {
      return true;
    }
  }

  return false;
}


/*
==================================================
SOCKET CONNECTION
==================================================
*/

io.on(
  "connection",
  (socket) => {

    console.log(
      "🟢 user connected:",
      socket.id
    );


    /*
    ==============================================
    REGISTER USER
    ==============================================
    */

    socket.on(
      "register-user",
      (data) => {

        const requestedId =
          normalizeUserId(
            data?.userId
          );

        let user =
          requestedId
            ? getUser(requestedId)
            : null;

        if (!user) {

          user =
            createUser(
              normalizeName(
                data?.name
              ),

              normalizeAvatar(
                data?.avatar
              )
            );
        }

        socket.data.userId =
          user.id;

        socket.data.userName =
          user.name;

        socket.data.avatar =
          user.avatar;

        socket.emit(
          "user-registered",
          {
            user
          }
        );

        emitFriendsUpdate(
          user.id
        );

        console.log(
          "👤 user registered:",
          user.id,
          user.name
        );
      }
    );


    /*
    ==============================================
    SEARCH USERS
    ==============================================
    */

    socket.on(
      "search-users",
      (data) => {

        const query =
          String(
            data?.query || ""
          )
            .trim()
            .slice(0, 40);

        if (!query) {

          socket.emit(
            "user-search-results",
            {
              users: []
            }
          );

          return;
        }

        const like =
          `%${query}%`;

        const users =
          db.prepare(`
            SELECT
              id,
              name,
              avatar,
              created_at AS createdAt
            FROM users
            WHERE
              id LIKE ?
              OR name LIKE ?
            ORDER BY
              name COLLATE NOCASE ASC
            LIMIT 20
          `).all(
            like,
            like
          );

        socket.emit(
          "user-search-results",
          {
            users
          }
        );
      }
    );


    /*
    ==============================================
    FRIEND REQUEST
    ==============================================
    */

    socket.on(
      "friend-request",
      (data) => {

        const fromId =
          socket.data.userId;

        const toId =
          normalizeUserId(
            data?.userId
          );

        if (
          !fromId ||
          !toId
        ) {
          return;
        }

        if (
          fromId === toId
        ) {

          socket.emit(
            "friend-error",
            {
              message:
                "Cannot add yourself"
            }
          );

          return;
        }

        const target =
          getUser(toId);

        if (!target) {

          socket.emit(
            "friend-error",
            {
              message:
                "User not found"
            }
          );

          return;
        }

        if (
          areFriends(
            fromId,
            toId
          )
        ) {

          socket.emit(
            "friend-error",
            {
              message:
                "Already friends"
            }
          );

          return;
        }

        const existing =
          db.prepare(`
            SELECT
              id,
              from_id AS fromId,
              to_id AS toId,
              status
            FROM friend_requests
            WHERE
              (
                from_id = ?
                AND to_id = ?
              )
              OR
              (
                from_id = ?
                AND to_id = ?
              )
            LIMIT 1
          `).get(
            fromId,
            toId,
            toId,
            fromId
          );

        if (
          existing &&
          existing.status === "pending"
        ) {

          socket.emit(
            "friend-error",
            {
              message:
                "Friend request already exists"
            }
          );

          return;
        }

        db.prepare(`
          DELETE FROM friend_requests
          WHERE
            (
              from_id = ?
              AND to_id = ?
            )
            OR
            (
              from_id = ?
              AND to_id = ?
            )
        `).run(
          fromId,
          toId,
          toId,
          fromId
        );

        db.prepare(`
          INSERT INTO friend_requests
            (from_id, to_id, status, created_at)
          VALUES
            (?, ?, 'pending', ?)
        `).run(
          fromId,
          toId,
          new Date().toISOString()
        );

        emitFriendsUpdate(
          fromId
        );

        emitFriendsUpdate(
          toId
        );

        socket.emit(
          "friend-success",
          {
            message:
              "Friend request sent"
          }
        );

        console.log(
          "👥 friend request:",
          fromId,
          "→",
          toId
        );
      }
    );


    /*
    ==============================================
    ACCEPT FRIEND
    ==============================================
    */

    socket.on(
      "friend-accept",
      (data) => {

        const userId =
          socket.data.userId;

        const requestId =
          Number(
            data?.requestId
          );

        if (
          !userId ||
          !requestId
        ) {
          return;
        }

        const request =
          db.prepare(`
            SELECT
              id,
              from_id AS fromId,
              to_id AS toId
            FROM friend_requests
            WHERE
              id = ?
              AND to_id = ?
              AND status = 'pending'
          `).get(
            requestId,
            userId
          );

        if (!request) {
          return;
        }

        addFriendship(
          request.fromId,
          request.toId
        );

        db.prepare(`
          UPDATE friend_requests
          SET status = 'accepted'
          WHERE id = ?
        `).run(
          requestId
        );

        emitFriendsUpdate(
          request.fromId
        );

        emitFriendsUpdate(
          request.toId
        );

        console.log(
          "✅ friends:",
          request.fromId,
          "<->",
          request.toId
        );
      }
    );


    /*
    ==============================================
    DECLINE FRIEND
    ==============================================
    */

    socket.on(
      "friend-decline",
      (data) => {

        const userId =
          socket.data.userId;

        const requestId =
          Number(
            data?.requestId
          );

        if (
          !userId ||
          !requestId
        ) {
          return;
        }

        db.prepare(`
          UPDATE friend_requests
          SET status = 'declined'
          WHERE
            id = ?
            AND to_id = ?
            AND status = 'pending'
        `).run(
          requestId,
          userId
        );

        emitFriendsUpdate(
          userId
        );
      }
    );


    /*
    ==============================================
    REMOVE FRIEND
    ==============================================
    */

    socket.on(
      "friend-remove",
      (data) => {

        const userId =
          socket.data.userId;

        const friendId =
          normalizeUserId(
            data?.userId
          );

        if (
          !userId ||
          !friendId
        ) {
          return;
        }

        db.prepare(`
          DELETE FROM friendships
          WHERE
            (
              user_id = ?
              AND friend_id = ?
            )
            OR
            (
              user_id = ?
              AND friend_id = ?
            )
        `).run(
          userId,
          friendId,
          friendId,
          userId
        );

        emitFriendsUpdate(
          userId
        );

        emitFriendsUpdate(
          friendId
        );
      }
    );


    /*
    ==============================================
    JOIN ROOM
    ==============================================
    */

    socket.on(
      "join-room",
      (data) => {

        const roomId =
          String(
            typeof data === "string"
              ? data
              : data?.roomId || ""
          )
            .trim()
            .toUpperCase();

        const userName =
          normalizeName(
            typeof data === "string"
              ? socket.data.userName
              : data?.userName ||
                socket.data.userName
          );

        const room =
          rooms.get(roomId);

        if (!room) {

          socket.emit(
            "room-not-found"
          );

          return;
        }

        if (
          socket.data.roomId ===
          roomId
        ) {
          return;
        }


        /*
        Leave old room
        */

        if (
          socket.data.roomId
        ) {

          const oldRoomId =
            socket.data.roomId;

          const oldRoom =
            rooms.get(
              oldRoomId
            );

          if (oldRoom) {

            oldRoom.users =
              Math.max(
                0,
                oldRoom.users - 1
              );

            io.to(
              oldRoomId
            ).emit(
              "users",
              oldRoom.users
            );

            emitPresence(
              oldRoomId
            );
          }

          socket.leave(
            oldRoomId
          );
        }


        /*
        Join new room
        */

        socket.join(
          roomId
        );

        socket.data.roomId =
          roomId;

        socket.data.userName =
          userName;

        socket.data.avatar =
          socket.data.avatar || "";

        socket.data.position =
          room.playback.position;

        socket.data.videoState =
          room.playback.action;

        room.users++;


        /*
        Send room state
        */

        socket.emit(
          "room-state",
          {
            roomId:
              room.id,

            title:
              room.title,

            videoUrl:
              room.videoUrl,

            action:
              room.playback.action,

            position:
              room.playback.position
          }
        );


        /*
        Users count
        */

        io.to(
          roomId
        ).emit(
          "users",
          room.users
        );


        /*
        Presence
        */

        emitPresence(
          roomId
        );


        console.log(
          "👤 joined:",
          roomId,
          socket.data.userName,
          "users:",
          room.users
        );
      }
    );


    /*
    ==============================================
    PROFILE UPDATE
    ==============================================
    */

    socket.on(
      "profile-update",
      (data) => {

        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();

        if (!roomId) {
          return;
        }

        if (
          socket.data.roomId !==
          roomId
        ) {
          return;
        }

        const room =
          rooms.get(roomId);

        if (!room) {
          return;
        }

        const name =
          normalizeName(
            data?.name
          );

        const avatar =
          normalizeAvatar(
            data?.avatar
          );

        if (
          avatar.length >
          1500000
        ) {
          return;
        }

        socket.data.userName =
          name;

        socket.data.avatar =
          avatar;


        /*
        Save in SQLite
        */

        if (
          socket.data.userId
        ) {

          updateUser(
            socket.data.userId,
            name,
            avatar
          );
        }


        /*
        Update room presence
        */

        emitPresence(
          roomId
        );


        /*
        Update friends
        */

        if (
          socket.data.userId
        ) {

          emitFriendsUpdate(
            socket.data.userId
          );
        }

        console.log(
          "👤 profile updated:",
          roomId,
          name
        );
      }
    );


    /*
    ==============================================
    VIDEO CONTROL
    ==============================================
    */

    socket.on(
      "video-control",
      (data) => {

        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();

        if (!roomId) {
          return;
        }

        if (
          socket.data.roomId !==
          roomId
        ) {
          return;
        }

        const room =
          rooms.get(roomId);

        if (!room) {
          return;
        }

        const action =
          data?.action === "play"
            ? "play"
            : "pause";

        const position =
          normalizePosition(
            data?.position
          );

        room.playback = {
          action,
          position
        };

        socket.data.position =
          position;

        socket.data.videoState =
          action;


        /*
        Send everyone except sender
        */

        socket
          .to(roomId)
          .emit(
            "video-control",
            {
              action,
              position,
              source:
                socket.id
            }
          );


        /*
        Update presence
        */

        emitPresence(
          roomId
        );
      }
    );


    /*
    ==============================================
    VIDEO POSITION
    ==============================================
    */

    socket.on(
      "video-position",
      (data) => {

        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();

        if (!roomId) {
          return;
        }

        if (
          socket.data.roomId !==
          roomId
        ) {
          return;
        }

        const position =
          normalizePosition(
            data?.position
          );

        socket.data.position =
          position;

        const room =
          rooms.get(roomId);

        if (room) {

          room.playback.position =
            position;
        }

        emitPresence(
          roomId
        );
      }
    );


    /*
    ==============================================
    REACTIONS
    ==============================================
    */

    socket.on(
      "reaction",
      (data) => {

        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();

        const reaction =
          String(
            data?.reaction || ""
          )
            .trim();

        if (
          !roomId ||
          !reaction
        ) {
          return;
        }

        if (
          socket.data.roomId !==
          roomId
        ) {
          return;
        }

        if (
          !rooms.has(roomId)
        ) {
          return;
        }

        const allowedReactions = [
          "❤️",
          "😂",
          "🔥",
          "😮",
          "😭",
          "💀"
        ];

        if (
          !allowedReactions.includes(
            reaction
          )
        ) {
          return;
        }

        io.to(
          roomId
        ).emit(
          "reaction",
          {
            id:
              `${socket.id}-${Date.now()}`,

            reaction,

            user:
              socket.data.userName ||
              "Guest"
          }
        );

        console.log(
          "💜 reaction:",
          roomId,
          socket.data.userName,
          reaction
        );
      }
    );


    /*
    ==============================================
    CHAT
    ==============================================
    */

    socket.on(
      "chat-message",
      (data) => {

        const roomId =
          String(
            data?.roomId || ""
          )
            .trim()
            .toUpperCase();

        const text =
          String(
            data?.text || ""
          )
            .trim()
            .slice(0, 1000);

        if (
          !roomId ||
          !text
        ) {
          return;
        }

        if (
          socket.data.roomId !==
          roomId
        ) {
          return;
        }

        if (
          !rooms.has(roomId)
        ) {
          return;
        }

        io.to(
          roomId
        ).emit(
          "chat-message",
          {
            user:
              socket.data.userName ||
              "Guest",

            text
          }
        );
      }
    );


    /*
    ==============================================
    DISCONNECT
    ==============================================
    */

    socket.on(
      "disconnect",
      () => {

        const roomId =
          socket.data.roomId;

        if (roomId) {

          const room =
            rooms.get(roomId);

          if (room) {

            room.users =
              Math.max(
                0,
                room.users - 1
              );

            io.to(
              roomId
            ).emit(
              "users",
              room.users
            );

            emitPresence(
              roomId
            );
          }
        }

        console.log(
          "🔴 user disconnected:",
          socket.id
        );
      }
    );

  }
);


/*
==================================================
START SERVER
==================================================
*/

const PORT =
  Number(
    process.env.PORT || 3001
  );


try {

  await app.listen({
    port: PORT,
    host: "0.0.0.0"
  });

  console.log(
    `🔥 VIBE server started on ${PORT}`
  );

} catch (error) {

  console.error(
    "❌ VIBE SERVER START ERROR:",
    error
  );

  process.exit(1);
}
