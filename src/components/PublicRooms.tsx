import { useMemo, useState } from "react";

type PublicRoom = {
  id: string;
  title: string;
  users: number;
  category: string;
  videoUrl?: string;
};

type Props = {
  rooms: PublicRoom[];
  onJoin: (roomId: string) => void;
};

const filters = [
  { id: "all", label: "ALL" },
  { id: "movies", label: "🎬 MOVIES" },
  { id: "series", label: "📺 SERIES" },
  { id: "music", label: "🎵 MUSIC" },
  { id: "gaming", label: "🎮 GAMING" },
  { id: "chill", label: "🌙 CHILL" }
];

const categoryNames: Record<string, string> = {
  movies: "Фильмы",
  series: "Сериалы",
  music: "Музыка",
  gaming: "Gaming",
  chill: "Chill",
  other: "Другое"
};

export default function PublicRooms({
  rooms,
  onJoin
}: Props) {
  const [filter, setFilter] =
    useState("all");

  const filteredRooms =
    useMemo(() => {
      if (filter === "all") {
        return rooms;
      }

      return rooms.filter(
        room =>
          String(room.category || "other")
            .toLowerCase() === filter
      );
    }, [rooms, filter]);

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
        {filters.map(item => (
          <button
            key={item.id}
            type="button"
            className={`public-room-filter ${
              filter === item.id
                ? "active"
                : ""
            }`}
            onClick={() =>
              setFilter(item.id)
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredRooms.length === 0 ? (
        <div className="public-rooms-empty">
          <p className="public-rooms-empty-title">
            Пока нет открытых комнат
          </p>

          <p className="public-rooms-empty-text">
            Создай свою комнату и пригласи людей в VIBE
          </p>
        </div>
      ) : (
        <div className="public-rooms-grid">

          {filteredRooms.map(room => {
            const category =
              String(
                room.category || "other"
              ).toLowerCase();

            return (
              <article
                key={room.id}
                className="public-room-card"
              >

                <div className="public-room-card-top">

                  <span className="public-room-category">
                    {categoryNames[category] ||
                      category}
                  </span>

                  <span className="public-room-live">
                    LIVE
                  </span>

                </div>

                <h3 className="public-room-title">
                  {room.title ||
                    "Без названия"}
                </h3>

                <div className="public-room-id">
                  ROOM #{room.id}
                </div>

                <div className="public-room-bottom">

                  <span className="public-room-viewers">
                    <span className="public-room-viewers-icon">
                      👥
                    </span>

                    {room.users}{" "}
                    {room.users === 1
                      ? "viewer"
                      : "viewers"}
                  </span>

                  <button
                    type="button"
                    className="public-room-join"
                    onClick={() =>
                      onJoin(room.id)
                    }
                  >
                    JOIN →
                  </button>

                </div>

              </article>
            );
          })}

        </div>
      )}

    </section>
  );
}
