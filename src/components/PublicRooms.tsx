```tsx
import {
  useMemo,
  useState
} from "react";


type PublicRoom = {
  id: string;
  title: string;
  users: number;
  category?: string;
  videoUrl?: string;
  public?: boolean;
};


type Props = {
  rooms: PublicRoom[];
  onJoin: (roomId: string) => void;
};


const filters = [
  {
    id: "all",
    label: "ALL"
  },
  {
    id: "movies",
    label: "🎬 MOVIES"
  },
  {
    id: "series",
    label: "📺 SERIES"
  },
  {
    id: "music",
    label: "🎵 MUSIC"
  },
  {
    id: "gaming",
    label: "🎮 GAMING"
  },
  {
    id: "chill",
    label: "🌙 CHILL"
  }
] as const;


const categoryNames: Record<string, string> = {
  movies: "Фильмы",
  series: "Сериалы",
  music: "Музыка",
  gaming: "Gaming",
  chill: "Chill",
  other: "Другое"
};


function normalizeCategory(category?: string) {
  const value = String(category || "other")
    .trim()
    .toLowerCase();

  return value || "other";
}


function normalizeUsers(users: unknown) {
  const value = Number(users);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value)
  );
}


export default function PublicRooms({
  rooms,
  onJoin
}: Props) {

  const [
    filter,
    setFilter
  ] = useState<
    (typeof filters)[number]["id"]
  >("all");


  const [
    joiningRoomId,
    setJoiningRoomId
  ] = useState<string | null>(null);


  const safeRooms = useMemo(
    () => {

      if (!Array.isArray(rooms)) {
        return [];
      }

      return rooms
        .filter(
          room =>
            Boolean(
              room &&
              room.id
            )
        )
        .map(
          room => ({
            ...room,

            id: String(
              room.id
            ),

            title: String(
              room.title ||
              "Без названия"
            ),

            users: normalizeUsers(
              room.users
            ),

            category: normalizeCategory(
              room.category
            )
          })
        );

    },
    [rooms]
  );


  const filteredRooms = useMemo(
    () => {

      if (filter === "all") {
        return safeRooms;
      }

      return safeRooms.filter(
        room =>
          normalizeCategory(
            room.category
          ) === filter
      );

    },
    [
      safeRooms,
      filter
    ]
  );


  function handleJoin(roomId: string) {

    const id = String(
      roomId
    )
      .trim()
      .toUpperCase();


    if (!id) {
      return;
    }


    if (joiningRoomId) {
      return;
    }


    setJoiningRoomId(id);


    try {

      onJoin(id);

    } finally {

      window.setTimeout(
        () => {
          setJoiningRoomId(null);
        },
        500
      );

    }

  }


  return (
    <section className="public-rooms">

      <div className="public-rooms-header">

        <div>

          <div className="live-now-badge">
            LIVE NOW
          </div>


          <h2 className="public-rooms-title">
            Сейчас смотрят вместе
          </h2>


          <p className="public-rooms-subtitle">
            Открытые VIBE-комнаты прямо сейчас
          </p>

        </div>

      </div>


      <div className="public-room-filters">

        {filters.map(
          item => {

            const filterClass =
              filter === item.id
                ? "public-room-filter active"
                : "public-room-filter";


            return (
              <button
                key={item.id}
                type="button"
                className={filterClass}
                onClick={() =>
                  setFilter(item.id)
                }
              >
                {item.label}
              </button>
            );

          }
        )}

      </div>


      {filteredRooms.length === 0 ? (

        <div className="public-rooms-empty">

          <p className="public-rooms-empty-title">
            {filter === "all"
              ? "Пока нет открытых комнат"
              : "В этой категории пока нет комнат"
            }
          </p>


          <p className="public-rooms-empty-text">
            {filter === "all"
              ? "Создай свою комнату и пригласи людей в VIBE"
              : "Попробуй выбрать другую категорию или создай свою комнату"
            }
          </p>

        </div>

      ) : (

        <div className="public-rooms-grid">

          {filteredRooms.map(
            room => {

              const category =
                normalizeCategory(
                  room.category
                );


              const users =
                normalizeUsers(
                  room.users
                );


              const isJoining =
                joiningRoomId ===
                room.id;


              return (

                <article
                  key={room.id}
                  className="public-room-card"
                >

                  <div className="public-room-card-top">

                    <span className="public-room-category">
                      {
                        categoryNames[
                          category
                        ] ||
                        category
                      }
                    </span>


                    <span className="public-room-live">
                      LIVE
                    </span>

                  </div>


                  <h3 className="public-room-title">
                    {
                      room.title ||
                      "Без названия"
                    }
                  </h3>


                  <div className="public-room-id">
                    ROOM #{room.id}
                  </div>


                  <div className="public-room-bottom">

                    <span className="public-room-viewers">

                      <span className="public-room-viewers-icon">
                        👥
                      </span>


                      {users}{" "}

                      {users === 1
                        ? "viewer"
                        : "viewers"
                      }

                    </span>


                    <button
                      type="button"
                      className="public-room-join"
                      onClick={() =>
                        handleJoin(
                          room.id
                        )
                      }
                      disabled={isJoining}
                    >

                      {isJoining
                        ? "JOINING..."
                        : "JOIN"
                      }

                    </button>

                  </div>

                </article>

              );

            }
          )}

        </div>

      )}

    </section>
  );

}
```
