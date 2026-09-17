import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
import Database from "better-sqlite3";


const app =
  Fastify({
    logger: true
  });


await app.register(
  cors,
  {
    origin: true
  }
);


const io =
  new Server(
    app.server,
    {
      cors: {
        origin: "*"
      }
    }
  );


const db =
  new Database(
    "vibe.sqlite"
  );


/*
  =========================
  DATABASE
  =========================
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT DEFAULT '',
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
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
  );
`);


/*
  =========================
  ROOMS
  =========================
*/

const rooms =
  new Map();


/*
  =========================
  ONLINE USERS
  =========================
*/

const onlineUsers =
  new Map();


/*
  =========================
  VIBE ID
  =========================
*/

function generateVibeId() {

  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result =
    "";

  for (
    let i = 0;
    i < 6;
    i++
  ) {

    result +=
      chars[
        Math.floor(
          Math.random() *
          chars.length
        )
      ];

  }

  return `VIBE-${result}`;

}


/*
  =========================
  USER HELPERS
  =========================
*/

function getUser(
  userId
) {

  return db
    .prepare(
      `
      SELECT
        id,
        name,
        avatar,
        created_at AS createdAt
      FROM users
      WHERE id = ?
      `
    )
    .get(
      userId
    );

}


function createUser(
  userId,
  name,
  avatar
) {

  const existing =
    getUser(
      userId
    );


  if (
    existing
  ) {

    db.prepare(
      `
      UPDATE users
      SET
        name = ?,
        avatar = ?
      WHERE id = ?
      `
    ).run(
      name,
      avatar,
      userId
    );


    return getUser(
      userId
    );

  }


  const id =
    userId ||
    generateVibeId();


  const createdAt =
    new Date()
      .toISOString();


  db.prepare(
    `
    INSERT INTO users
      (
        id,
        name,
        avatar,
        created_at
      )
    VALUES
      (?, ?, ?, ?)
    `
  ).run(
    id,
    name,
    avatar,
    createdAt
  );


  return getUser(
    id
  );

}


/*
  =========================
  FRIEND HELPERS
  =========================
*/

function getFriends(
  userId
) {

  return db
    .prepare(
      `
      SELECT
        u.id,
        u.name,
        u.avatar,
        u.created_at AS createdAt
      FROM friendships f
      JOIN users u
        ON u.id = f.friend_id
      WHERE f.user_id = ?
      ORDER BY u.name COLLATE NOCASE
      `
    )
    .all(
      userId
    );

}


function getIncomingRequests(
  userId
) {

  return db
    .prepare(
      `
      SELECT
        r.id,
        r.created_at AS createdAt,
        u.id AS userId,
        u.name,
        u.avatar
      FROM friend_requests r
      JOIN users u
        ON u.id = r.from_user_id
      WHERE
        r.to_user_id = ?
        AND r.status = 'pending'
      ORDER BY r.id DESC
      `
    )
    .all(
      userId
    );

}


function getOutgoingRequests(
  userId
) {

  return db
    .prepare(
      `
      SELECT
        r.id,
        r.created_at AS createdAt,
        u.id AS userId,
        u.name,
        u.avatar
      FROM friend_requests r
      JOIN users u
        ON u.id = r.to_user_id
      WHERE
        r.from_user_id = ?
        AND r.status = 'pending'
      ORDER BY r.id DESC
      `
    )
    .all(
      userId
    );

}


function emitFriendsData(
  userId
) {

  const socketId =
    onlineUsers.get(
      userId
    );


  if (
    !socketId
  ) {

    return;

  }


  io.to(
    socketId
  ).emit(
    "friends-data",
    {
      friends:
        getFriends(
          userId
        ),

      incoming:
        getIncomingRequests(
          userId
        ),

      outgoing:
        getOutgoingRequests(
          userId
        )
    }
  );

}


/*
  =========================
  ROOM PRESENCE
  =========================
*/

function createRoomPresence(
  room
) {

  if (
    !room.participants
  ) {

    room.participants =
      new Map();

  }

  return room.participants;

}


function formatTime(
  seconds
) {

  const safe =
    Math.max(
      0,
      Math.floor(
        Number(seconds) || 0
      )
    );


  const minutes =
    Math.floor(
      safe / 60
    );


  const remaining =
    safe % 60;


  return (
    `${String(minutes).padStart(2, "0")}:` +
    `${String(remaining).padStart(2, "0")}`
  );

}


function getPresence(
  room
) {

  const participants =
    createRoomPresence(
      room
    );


  return Array.from(
    participants.values()
  ).map(
    participant => ({

      id:
        participant.id,

      name:
        participant.name,

      avatar:
        participant.avatar,

      position:
        Number(
          participant.position
        ) || 0,

      time:
        formatTime(
          participant.position
        ),

      state:
        participant.state === "play"
          ? "play"
          : "pause"

    })
  );

}


function emitRoomPresence(
  roomId
) {

  const room =
    rooms.get(
      roomId
    );


  if (
    !room
  ) {

    return;

  }


  const participants =
    createRoomPresence(
      room
    );


  room.users =
    participants.size;


  io.to(
    roomId
  ).emit(
    "users",
    room.users
  );


  io.to(
    roomId
  ).emit(
    "presence",
    getPresence(
      room
    )
  );

}


function removeSocketFromRoom(
  socket,
  roomId
) {

  if (
    !roomId
  ) {

    return;

  }


  const room =
    rooms.get(
      roomId
    );


  if (
    !room
  ) {

    return;

  }


  const participants =
    createRoomPresence(
      room
    );


  participants.delete(
    socket.id
  );


  room.users =
    participants.size;


  io.to(
    roomId
  ).emit(
    "users",
    room.users
  );


  io.to(
    roomId
  ).emit(
    "presence",
    getPresence(
      room
    )
  );

}


/*
  =========================
  HTTP
  =========================
*/

app.get(
  "/",
  async () => {

    return {
      ok:
        true,

      service:
        "vibe-server",

      rooms:
        rooms.size,

      users:
        onlineUsers.size

    };

  }
);


/*
  =========================
  USERS
  =========================
*/

app.get(
  "/users",
  async () => {

    return {
      users:
        db
          .prepare(
            `
            SELECT
              id,
              name,
              avatar,
              created_at AS createdAt
            FROM users
            ORDER BY name COLLATE NOCASE
            `
          )
          .all()
    };

  }
);


app.get(
  "/users/:userId",
  async request => {

    const user =
      getUser(
        request.params.userId
      );


    if (
      !user
    ) {

      return {
        error:
          "User not found"
      };

    }


    return {
      user
    };

  }
);


app.get(
  "/users/search",
  async request => {

    const query =
      String(
        request.query?.q ||
        ""
      )
        .trim()
        .slice(0, 80);


    if (
      !query
    ) {

      return {
        users: []
      };

    }


    const like =
      `%${query}%`;


    const users =
      db
        .prepare(
          `
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
            name COLLATE NOCASE
          LIMIT 20
          `
        )
        .all(
          like,
          like
        );


    return {
      users
    };

  }
);


/*
  =========================
  ROOMS
  =========================
*/

app.get(
  "/rooms",
  async () => {

    return {
      rooms:
        Array.from(
          rooms.values()
        ).map(
          room => ({
            ...room,

            participants:
              undefined
          })
        )

    };

  }
);


/*
  =========================
  CREATE ROOM
  =========================
*/

app.post(
  "/rooms",
  async request => {

    const data =
      request.body ||
      {};


    const roomId =
      String(
        data.roomId ||
        ""
      )
        .trim()
        .toUpperCase();


    if (
      !roomId
    ) {

      return {
        error:
          "Room ID is required"
      };

    }


    if (
      rooms.has(
        roomId
      )
    ) {

      return {
        error:
          "Room already exists"
      };

    }


    const room = {

      id:
        roomId,

      title:
        String(
          data.title ||
          `Комната ${roomId}`
        )
          .trim()
          .slice(0, 80),

      videoUrl:
        String(
          data.videoUrl ||
          ""
        )
          .trim(),

      public:
        Boolean(
          data.public
        ),

      category:
        String(
          data.category ||
          "other"
        )
          .trim()
          .toLowerCase(),

      users:
        0,

      playback: {

        action:
          "pause",

        position:
          0

      },

      playbackVersion:
        0,

      participants:
        new Map()

    };


    rooms.set(
      roomId,
      room
    );


    return {
      ok:
        true,

      room
    };

  }
);


/*
  =========================
  PUBLIC ROOMS
  =========================
*/

app.get(
  "/rooms/public",
  async () => {

    const publicRooms =
      Array.from(
        rooms.values()
      )
        .filter(
          room =>
            room.public === true &&
            room.users > 0
        )
        .sort(
          (a, b) =>
            b.users -
            a.users
        )
        .map(
          room => ({

            id:
              room.id,

            title:
              room.title,

            videoUrl:
              room.videoUrl,

            users:
              room.users,

            category:
              room.category

          })
        );


    return {
      rooms:
        publicRooms
    };

  }
);


/*
  =========================
  GET ROOM
  =========================
*/

app.get(
  "/rooms/:roomId",
  async request => {

    const room =
      rooms.get(
        String(
          request.params.roomId
        )
          .trim()
          .toUpperCase()
      );


    if (
      !room
    ) {

      return {
        error:
          "Room not found"
      };

    }


    return {
      room: {
        ...room,

        participants:
          undefined
      }
    };

  }
);


/*
  =========================
  SOCKET
  =========================
*/

io.on(
  "connection",
  socket => {

    let currentUserId =
      null;

    let currentRoomId =
      null;


    /*
      =========================
      REGISTER USER
      =========================
    */

    socket.on(
      "register-user",
      data => {

        const requestedId =
          String(
            data?.userId ||
            ""
          )
            .trim()
            .toUpperCase();


        const name =
          String(
            data?.name ||
            "Guest"
          )
            .trim()
            .slice(0, 40) ||
          "Guest";


        const avatar =
          String(
            data?.avatar ||
            ""
          );


        let userId =
          requestedId;


        if (
          requestedId
        ) {

          const existing =
            getUser(
              requestedId
            );


          if (
            existing
          ) {

            userId =
              existing.id;

          }

        }


        if (
          !userId
        ) {

          userId =
            generateVibeId();

        }


        const user =
          createUser(
            userId,
            name,
            avatar
          );


        currentUserId =
          user.id;


        onlineUsers.set(
          user.id,
          socket.id
        );


        socket.emit(
          "user-registered",
          {
            user
          }
        );


        emitFriendsData(
          user.id
        );


        console.log(
          "🆔 user:",
          user.id
        );

      }
    );


    /*
      =========================
      SEARCH USERS
      =========================
    */

    socket.on(
      "search-users",
      data => {

        const query =
          String(
            data?.query ||
            ""
          )
            .trim()
            .slice(0, 80);


        if (
          !query
        ) {

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
          db
            .prepare(
              `
              SELECT
                id,
                name,
                avatar,
                created_at AS createdAt
              FROM users
              WHERE
                (
                  id LIKE ?
                  OR name LIKE ?
                )
                AND id != ?
              ORDER BY
                name COLLATE NOCASE
              LIMIT 20
              `
            )
            .all(
              like,
              like,
              currentUserId ||
                ""
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
      =========================
      FRIEND REQUEST
      =========================
    */

    socket.on(
      "friend-request",
      data => {

        if (
          !currentUserId
        ) {

          return;

        }


        const targetId =
          String(
            data?.userId ||
            ""
          )
            .trim()
            .toUpperCase();


        if (
          !targetId ||
          targetId ===
            currentUserId
        ) {

          socket.emit(
            "friend-error",
            {
              message:
                "Invalid user"
            }
          );

          return;

        }


        const target =
          getUser(
            targetId
          );


        if (
          !target
        ) {

          socket.emit(
            "friend-error",
            {
              message:
                "User not found"
            }
          );

          return;

        }


        const alreadyFriends =
          db
            .prepare(
              `
              SELECT id
              FROM friendships
              WHERE
                user_id = ?
                AND friend_id = ?
              `
            )
            .get(
              currentUserId,
              targetId
            );


        if (
          alreadyFriends
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


        const existingRequest =
          db
            .prepare(
              `
              SELECT id
              FROM friend_requests
              WHERE
                from_user_id = ?
                AND to_user_id = ?
                AND status = 'pending'
              `
            )
            .get(
              currentUserId,
              targetId
            );


        if (
          existingRequest
        ) {

          socket.emit(
            "friend-error",
            {
              message:
                "Request already sent"
            }
          );

          return;

        }


        const reverseRequest =
          db
            .prepare(
              `
              SELECT id
              FROM friend_requests
              WHERE
                from_user_id = ?
                AND to_user_id = ?
                AND status = 'pending'
              `
            )
            .get(
              targetId,
              currentUserId
            );


        if (
          reverseRequest
        ) {

          socket.emit(
            "friend-error",
            {
              message:
                "This user already sent you a request"
            }
          );

          return;

        }


        const createdAt =
          new Date()
            .toISOString();


        const result =
          db
            .prepare(
              `
              INSERT INTO friend_requests
                (
                  from_user_id,
                  to_user_id,
                  created_at,
                  status
                )
              VALUES
                (?, ?, ?, 'pending')
              `
            )
            .run(
              currentUserId,
              targetId,
              createdAt
            );


        socket.emit(
          "friend-success",
          {
            message:
              "Friend request sent"
          }
        );


        emitFriendsData(
          currentUserId
        );


        emitFriendsData(
          targetId
        );


        console.log(
          "🤝 friend request:",
          result.lastInsertRowid
        );

      }
    );


    /*
      =========================
      ACCEPT FRIEND
      =========================
    */

    socket.on(
      "friend-accept",
      data => {

        if (
          !currentUserId
        ) {

          return;

        }


        const requestId =
          Number(
            data?.requestId
          );


        const request =
          db
            .prepare(
              `
              SELECT *
              FROM friend_requests
              WHERE
                id = ?
                AND to_user_id = ?
                AND status = 'pending'
              `
            )
            .get(
              requestId,
              currentUserId
            );


        if (
          !request
        ) {

          socket.emit(
            "friend-error",
            {
              message:
                "Request not found"
            }
          );

          return;

        }


        const transaction =
          db.transaction(
            () => {

              db.prepare(
                `
                UPDATE friend_requests
                SET status = 'accepted'
                WHERE id = ?
                `
              ).run(
                requestId
              );


              db.prepare(
                `
                INSERT OR IGNORE INTO friendships
                  (
                    user_id,
                    friend_id,
                    created_at
                  )
                VALUES
                  (?, ?, ?)
                `
              ).run(
                request.from_user_id,
                request.to_user_id,
                new Date()
                  .toISOString()
              );


              db.prepare(
                `
                INSERT OR IGNORE INTO friendships
                  (
                    user_id,
                    friend_id,
                    created_at
                  )
                VALUES
                  (?, ?, ?)
                `
              ).run(
                request.to_user_id,
                request.from_user_id,
                new Date()
                  .toISOString()
              );

            }
          );


        transaction();


        socket.emit(
          "friend-success",
          {
            message:
              "Friend request accepted"
          }
        );


        emitFriendsData(
          request.from_user_id
        );


        emitFriendsData(
          request.to_user_id
        );

      }
    );


    /*
      =========================
      DECLINE FRIEND
      =========================
    */

    socket.on(
      "friend-decline",
      data => {

        if (
          !currentUserId
        ) {

          return;

        }


        const requestId =
          Number(
            data?.requestId
          );


        const result =
          db
            .prepare(
              `
              UPDATE friend_requests
              SET status = 'declined'
              WHERE
                id = ?
                AND to_user_id = ?
                AND status = 'pending'
              `
            )
            .run(
              requestId,
              currentUserId
            );


        if (
          result.changes ===
          0
        ) {

          return;

        }


        emitFriendsData(
          currentUserId
        );

      }
    );


    /*
      =========================
      REMOVE FRIEND
      =========================
    */

    socket.on(
      "friend-remove",
      data => {

        if (
          !currentUserId
        ) {

          return;

        }


        const friendId =
          String(
            data?.userId ||
            ""
          )
            .trim()
            .toUpperCase();


        db.prepare(
          `
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
          `
        ).run(
          currentUserId,
          friendId,
          friendId,
          currentUserId
        );


        emitFriendsData(
          currentUserId
        );


        emitFriendsData(
          friendId
        );

      }
    );


    /*
      =========================
      JOIN ROOM
      =========================
    */

    socket.on(
      "join-room",
      data => {

        const roomId =
          String(
            data?.roomId ||
            ""
          )
            .trim()
            .toUpperCase();


        const userName =
          String(
            data?.userName ||
            "Guest"
          )
            .trim()
            .slice(0, 40) ||
          "Guest";


        const room =
          rooms.get(
            roomId
          );


        if (
          !room
        ) {

          socket.emit(
            "room-error",
            {
              message:
                "Room not found"
            }
          );

          return;

        }


        if (
          currentRoomId &&
          currentRoomId !== roomId
        ) {

          removeSocketFromRoom(
            socket,
            currentRoomId
          );


          socket.leave(
            currentRoomId
          );

        }


        if (
          currentRoomId === roomId
        ) {

          socket.join(
            roomId
          );


          createRoomPresence(
            room
          );


          const existingParticipant =
            room.participants.get(
              socket.id
            );


          if (
            existingParticipant
          ) {

            existingParticipant.name =
              userName;


            if (
              currentUserId
            ) {

              existingParticipant.id =
                currentUserId;

            }

          }


          room.users =
            room.participants.size;


          socket.emit(
            "room-state",
            {
              action:
                room.playback?.action ||
                "pause",

              position:
                Number(
                  room.playback?.position
                ) || 0,

              id:
                room.playbackVersion || 0
            }
          );


          emitRoomPresence(
            roomId
          );


          return;

        }


        currentRoomId =
          roomId;


        socket.join(
          roomId
        );


        const participants =
          createRoomPresence(
            room
          );


        participants.set(
          socket.id,
          {

            id:
              currentUserId ||
              socket.id,

            name:
              userName,

            avatar:
              currentUserId
                ? (
                    getUser(
                      currentUserId
                    )?.avatar ||
                    ""
                  )
                : "",

            position:
              Number(
                room.playback?.position
              ) || 0,

            state:
              room.playback?.action === "play"
                ? "play"
                : "pause",

            joinedAt:
              Date.now()

          }
        );


        room.users =
          participants.size;


        socket.emit(
          "room-joined",
          {
            room: {
              ...room,

              participants:
                undefined
            },

            userName
          }
        );


        socket.emit(
          "room-state",
          {

            action:
              room.playback?.action ||
              "pause",

            position:
              Number(
                room.playback?.position
              ) || 0,

            id:
              room.playbackVersion || 0

          }
        );


        emitRoomPresence(
          roomId
        );

      }
    );


    /*
      =========================
      PROFILE UPDATE
      =========================
    */

    socket.on(
      "profile-update",
      data => {

        if (
          !currentUserId
        ) {

          return;

        }


        const name =
          String(
            data?.name ||
            "Guest"
          )
            .trim()
            .slice(0, 40) ||
          "Guest";


        const avatar =
          String(
            data?.avatar ||
            ""
          );


        db.prepare(
          `
          UPDATE users
          SET
            name = ?,
            avatar = ?
          WHERE id = ?
          `
        ).run(
          name,
          avatar,
          currentUserId
        );


        const user =
          getUser(
            currentUserId
          );


        socket.emit(
          "user-registered",
          {
            user
          }
        );


        if (
          currentRoomId
        ) {

          const room =
            rooms.get(
              currentRoomId
            );


          if (
            room
          ) {

            const participant =
              room.participants?.get(
                socket.id
              );


            if (
              participant
            ) {

              participant.id =
                currentUserId;

              participant.name =
                name;

              participant.avatar =
                avatar;

            }


            emitRoomPresence(
              currentRoomId
            );

          }

        }


        emitFriendsData(
          currentUserId
        );

      }
    );


    /*
      =========================
      VIDEO CONTROL
      =========================
    */

    socket.on(
      "video-control",
      data => {

        const roomId =
          String(
            data?.roomId ||
            ""
          )
            .trim()
            .toUpperCase();


        const room =
          rooms.get(
            roomId
          );


        if (
          !room
        ) {

          return;

        }


        const action =
          data?.action === "play"
            ? "play"
            : "pause";


        const rawPosition =
          Number(
            data?.position
          );


        const position =
          Number.isFinite(
            rawPosition
          )
            ? Math.max(
                0,
                rawPosition
              )
            : Number(
                room.playback?.position
              ) || 0;


        /*
          PLAY / PAUSE — единственная
          команда, которая меняет
          глобальное состояние action.
        */

        room.playback =
          {
            action,
            position
          };


        room.playbackVersion =
          (
            Number(
              room.playbackVersion
            ) || 0
          ) + 1;


        /*
          Обновляем отправителя.
        */

        const participant =
          room.participants?.get(
            socket.id
          );


        if (
          participant
        ) {

          participant.position =
            position;

          participant.state =
            action;

        }


        /*
          Обновляем состояние
          остальных участников.

          Их текущая позиция здесь
          НЕ трогается.
        */

        if (
          room.participants
        ) {

          for (
            const [
              participantSocketId,
              otherParticipant
            ]
            of room.participants.entries()
          ) {

            if (
              participantSocketId ===
              socket.id
            ) {

              continue;

            }


            otherParticipant.state =
              action;

          }

        }


        /*
          Отправляем команду только
          другим клиентам.

          Отправитель уже находится
          в нужном состоянии.
        */

        socket
          .to(
            roomId
          )
          .emit(
            "video-control",
            {
              action,

              position,

              id:
                room.playbackVersion
            }
          );


        /*
          Presence отправляем всем.
        */

        io.to(
          roomId
        ).emit(
          "presence",
          getPresence(
            room
          )
        );

      }
    );


    /*
      =========================
      VIDEO SEEK
      =========================
    */

    socket.on(
      "video-seek",
      data => {

        const roomId =
          String(
            data?.roomId ||
            ""
          )
            .trim()
            .toUpperCase();


        const room =
          rooms.get(
            roomId
          );


        if (
          !room
        ) {

          return;

        }


        const rawPosition =
          Number(
            data?.position
          );


        if (
          !Number.isFinite(
            rawPosition
          )
        ) {

          return;

        }


        const position =
          Math.max(
            0,
            rawPosition
          );


        /*
          SEEK меняет только позицию.

          PLAY / PAUSE НЕ меняется.
        */

        room.playback.position =
          position;


        const participant =
          room.participants?.get(
            socket.id
          );


        if (
          participant
        ) {

          participant.position =
            position;

          participant.state =
            room.playback?.action === "play"
              ? "play"
              : "pause";

        }


        /*
          Другим клиентам отправляем
          ТОЛЬКО перемотку.
        */

        socket
          .to(
            roomId
          )
          .emit(
            "video-seek",
            {
              position
            }
          );


        /*
          Presence обновляем всем.
        */

        io.to(
          roomId
        ).emit(
          "presence",
          getPresence(
            room
          )
        );

      }
    );


    /*
      =========================
      VIDEO POSITION
      =========================
    */

    socket.on(
      "video-position",
      data => {

        const roomId =
          String(
            data?.roomId ||
            ""
          )
            .trim()
            .toUpperCase();


        const room =
          rooms.get(
            roomId
          );


        if (
          !room
        ) {

          return;

        }


        const position =
          Number(
            data?.position
          );


        if (
          !Number.isFinite(
            position
          )
        ) {

          return;

        }


        const safePosition =
          Math.max(
            0,
            position
          );


        /*
          ВАЖНО:

          video-position НЕ меняет
          room.playback.position.

          Иначе обычная отправка позиции
          может перетереть результат
          Play / Pause / Seek.

          Эта команда нужна только
          для Presence конкретного
          участника.
        */

        const participant =
          room.participants?.get(
            socket.id
          );


        if (
          participant
        ) {

          participant.position =
            safePosition;

          participant.state =
            room.playback?.action === "play"
              ? "play"
              : "pause";

        }


        /*
          Никакого video-control
          другим клиентам здесь нет.
        */

        io.to(
          roomId
        ).emit(
          "presence",
          getPresence(
            room
          )
        );

      }
    );


    /*
      =========================
      REACTIONS
      =========================
    */

    socket.on(
      "reaction",
      data => {

        const roomId =
          String(
            data?.roomId ||
            ""
          )
            .trim()
            .toUpperCase();


        const reaction =
          String(
            data?.reaction ||
            ""
          );


        const allowed =
          [
            "❤️",
            "😂",
            "🔥",
            "😮",
            "😭",
            "💀"
          ];


        if (
          !allowed.includes(
            reaction
          )
        ) {

          return;

        }


        if (
          !rooms.has(
            roomId
          )
        ) {

          return;

        }


        const user =
          currentUserId
            ? getUser(
                currentUserId
              )
            : null;


        io.to(
          roomId
        ).emit(
          "reaction",
          {

            id:
              `${Date.now()}-${Math.random()}`,

            reaction,

            user:
              user?.name ||
              "Guest"

          }
        );

      }
    );


    /*
      =========================
      CHAT
      =========================
    */

    socket.on(
      "chat-message",
      data => {

        const roomId =
          String(
            data?.roomId ||
            ""
          )
            .trim()
            .toUpperCase();


        const text =
          String(
            data?.text ||
            ""
          )
            .trim()
            .slice(0, 1000);


        if (
          !text
        ) {

          return;

        }


        if (
          !rooms.has(
            roomId
          )
        ) {

          return;

        }


        io.to(
          roomId
        ).emit(
          "chat-message",
          {

            userId:
              currentUserId,

            text,

            createdAt:
              new Date()
                .toISOString()

          }
        );

      }
    );


    /*
      =========================
      DISCONNECT
      =========================
    */

    socket.on(
      "disconnect",
      () => {

        if (
          currentRoomId
        ) {

          removeSocketFromRoom(
            socket,
            currentRoomId
          );

        }


        if (
          currentUserId &&
          onlineUsers.get(
            currentUserId
          ) ===
            socket.id
        ) {

          onlineUsers.delete(
            currentUserId
          );

        }


        console.log(
          "🔴 disconnected:",
          socket.id
        );

      }
    );

  }
);


/*
  =========================
  START
  =========================
*/

const PORT =
  Number(
    process.env.PORT ||
    3001
  );


await app.listen(
  {
    port:
      PORT,

    host:
      "0.0.0.0"
  }
);


console.log(
  `🚀 VIBE server running on port ${PORT}`
);
