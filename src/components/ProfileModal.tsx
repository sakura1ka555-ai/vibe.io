```tsx
import {
  ChangeEvent,
  useRef,
  useState
} from "react";

export type ProfileData = {
  name: string;
  avatar: string;
};

type Props = {
  profile: ProfileData;
  onSave: (profile: ProfileData) => void;
  onClose: () => void;
};

function ProfileModal({
  profile,
  onSave,
  onClose
}: Props) {
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [isEditing, setIsEditing] = useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Выбери изображение");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Изображение должно быть меньше 5 MB");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatar(reader.result);
      }
    };

    reader.readAsDataURL(file);
  }

  function saveProfile() {
    const cleanName = name
      .trim()
      .slice(0, 30);

    if (!cleanName) {
      alert("Введи имя");
      return;
    }

    onSave({
      name: cleanName,
      avatar: avatar || ""
    });

    setName(cleanName);
    setIsEditing(false);
  }

  function cancelEditing() {
    setName(profile.name);
    setAvatar(profile.avatar);
    setIsEditing(false);
  }

  const avatarLetter = (
    name || "G"
  )
    .charAt(0)
    .toUpperCase();

  const username =
    (name || "guest")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_а-яё]/gi, "")
      .slice(0, 24) || "guest";

  return (
    <div
      className="profile-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="profile-modal profile-modal-full"
        onClick={(event) => event.stopPropagation()}
      >

        {/* HEADER */}
        <div className="profile-modal-header">

          <div className="profile-modal-user-mini">

            <div className="profile-modal-mini-avatar">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                />
              ) : (
                avatarLetter
              )}
            </div>

            <div>
              <div className="profile-modal-mini-name">
                {name || "Guest"}
              </div>

              <div className="profile-modal-mini-label">
                PROFILE
              </div>
            </div>

          </div>

          <div className="profile-modal-header-actions">

            <button
              type="button"
              className="profile-edit-trigger"
              onClick={() => setIsEditing(true)}
              aria-label="Редактировать профиль"
              title="Редактировать"
            >
              ✎
            </button>

            <button
              type="button"
              className="profile-modal-close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              ×
            </button>

          </div>

        </div>

        {/* PROFILE CONTENT */}
        <div className="profile-content">

          {/* HERO */}
          <section className="profile-hero">

            <button
              type="button"
              className="profile-main-avatar"
              onClick={() => {
                if (isEditing) {
                  fileInputRef.current?.click();
                }
              }}
              aria-label={
                isEditing
                  ? "Изменить аватар"
                  : "Аватар"
              }
            >

              {avatar ? (
                <img
                  src={avatar}
                  alt="Аватар"
                />
              ) : (
                <span>
                  {avatarLetter}
                </span>
              )}

              <span className="profile-online-ring" />

              {isEditing && (
                <span className="profile-main-avatar-edit">
                  ✎
                </span>
              )}

            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{
                display: "none"
              }}
            />

            <h2 className="profile-display-name">
              {name || "Guest"}
            </h2>

            <div className="profile-username">
              @{username}
            </div>

            <div className="profile-status">
              <span className="profile-status-dot" />
              Online
            </div>

          </section>

          {/* BIO */}
          <section className="profile-section">

            <div className="profile-section-heading">

              <div className="profile-section-title">
                <span className="profile-section-icon">
                  👥
                </span>

                <span>
                  Bio
                </span>
              </div>

              <span className="profile-section-menu">
                ≡
              </span>

            </div>

            <p className="profile-bio">
              {isEditing
                ? "Расскажи немного о себе."
                : "Enter your bio here..."}
            </p>

          </section>

          {/* GALLERY */}
          <section className="profile-section">

            <div className="profile-section-heading">

              <div className="profile-section-title">

                <span className="profile-section-icon">
                  🖼
                </span>

                <span>
                  Gallery
                </span>

              </div>

              <span className="profile-section-menu">
                ≡
              </span>

            </div>

            <div className="profile-gallery">

              <button
                type="button"
                className="profile-gallery-add"
                onClick={() => {
                  if (isEditing) {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <span>
                  +
                </span>

                <small>
                  {isEditing
                    ? "ADD"
                    : "PHOTO"}
                </small>
              </button>

              {avatar && (
                <div className="profile-gallery-item">

                  <img
                    src={avatar}
                    alt="Gallery"
                  />

                </div>
              )}

            </div>

          </section>

          {/* STATS */}
          <section className="profile-section profile-stats-section">

            <div className="profile-section-heading">

              <div className="profile-section-title">

                <span className="profile-section-icon">
                  📊
                </span>

                <span>
                  Stats
                </span>

              </div>

              <span className="profile-section-menu">
                ≡
              </span>

            </div>

            <div className="profile-stats">

              {/* ONLINE */}
              <div className="profile-stat-row">

                <div className="profile-stat-label">

                  <span className="profile-stat-icon online">
                    🟢
                  </span>

                  Online

                </div>

                <div className="profile-stat-value">

                  <span className="profile-eye">
                    👁
                  </span>

                </div>

              </div>

              {/* JOIN DATE */}
              <div className="profile-stat-row">

                <div className="profile-stat-label">

                  <span className="profile-stat-icon">
                    📅
                  </span>

                  Join Date

                </div>

                <div className="profile-stat-value">
                  Nov 9, 2025
                </div>

              </div>

              {/* VIBE TIME */}
              <div className="profile-stat-row">

                <div className="profile-stat-label">

                  <span className="profile-stat-icon">
                    ◷
                  </span>

                  Vibe Time

                </div>

                <div className="profile-stat-value">
                  79 hours
                </div>

              </div>

            </div>

          </section>

          {/* ACTIVITY */}
          <section className="profile-activity">

            <div className="profile-activity-tabs">

              <button
                type="button"
                className="profile-activity-tab active"
              >
                ▥
              </button>

              <button
                type="button"
                className="profile-activity-tab"
              >
                ▦
              </button>

            </div>

            <div className="profile-chart">

              <div className="profile-chart-grid">
                <span />
                <span />
                <span />
                <span />
              </div>

              <svg
                className="profile-chart-line"
                viewBox="0 0 360 120"
                preserveAspectRatio="none"
                aria-label="График активности"
              >

                <defs>

                  <linearGradient
                    id="profileChartGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >

                    <stop
                      offset="0%"
                      stopColor="#7541a9"
                    />

                    <stop
                      offset="50%"
                      stopColor="#a66cff"
                    />

                    <stop
                      offset="100%"
                      stopColor="#7541a9"
                    />

                  </linearGradient>

                  <linearGradient
                    id="profileChartFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >

                    <stop
                      offset="0%"
                      stopColor="#a66cff"
                      stopOpacity=".20"
                    />

                    <stop
                      offset="100%"
                      stopColor="#a66cff"
                      stopOpacity="0"
                    />

                  </linearGradient>

                </defs>

                <path
                  d="
                    M0 100
                    L0 91
                    L35 84
                    L70 88
                    L105 64
                    L140 72
                    L175 42
                    L210 56
                    L245 29
                    L280 47
                    L315 22
                    L360 35
                    L360 120
                    L0 120
                    Z
                  "
                  fill="url(#profileChartFill)"
                />

                <path
                  d="
                    M0 91
                    L35 84
                    L70 88
                    L105 64
                    L140 72
                    L175 42
                    L210 56
                    L245 29
                    L280 47
                    L315 22
                    L360 35
                  "
                  fill="none"
                  stroke="url(#profileChartGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

              </svg>

              <div className="profile-chart-labels">

                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
                <span>SAT</span>
                <span>SUN</span>

              </div>

            </div>

          </section>

        </div>

        {/* EDIT PANEL */}
        {isEditing && (
          <div className="profile-edit-panel">

            <div className="profile-edit-panel-inner">

              <div className="profile-edit-title">
                EDIT PROFILE
              </div>

              <div className="profile-edit-avatar-row">

                <button
                  type="button"
                  className="profile-edit-avatar"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                >

                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Аватар"
                    />
                  ) : (
                    avatarLetter
                  )}

                  <span>
                    ✎
                  </span>

                </button>

                <div>

                  <strong>
                    {name || "Guest"}
                  </strong>

                  <small>
                    Нажми на аватар, чтобы изменить
                  </small>

                </div>

              </div>

              <div className="profile-field">

                <label>
                  NAME
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Твоё имя"
                  maxLength={30}
                  autoComplete="off"
                  autoFocus
                />

              </div>

              <button
                type="button"
                className="profile-save-button"
                onClick={saveProfile}
              >
                SAVE
              </button>

              <button
                type="button"
                className="profile-cancel-button"
                onClick={cancelEditing}
              >
                CANCEL
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default ProfileModal;
```
