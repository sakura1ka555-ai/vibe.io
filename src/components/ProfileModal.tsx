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

  vibeTimeSeconds?: number;

  weeklyActivity?: number[];

  isOnline?: boolean;

  onSave: (
    profile: ProfileData
  ) => void;

  onClose: () => void;
};


function formatVibeTime(
  totalSeconds: number
) {

  const seconds =
    Math.max(
      0,
      Math.floor(
        totalSeconds || 0
      )
    );


  const hours =
    Math.floor(
      seconds / 3600
    );


  const minutes =
    Math.floor(
      (
        seconds % 3600
      ) / 60
    );


  if (hours === 0) {

    return `${minutes} min`;

  }


  if (minutes === 0) {

    return `${hours} h`;

  }


  return `${hours} h ${minutes} min`;

}


function createChartPath(
  values: number[]
) {

  if (
    !values.length
  ) {
    return "";
  }


  const width =
    360;

  const height =
    120;

  const padding =
    8;


  const maxValue =
    Math.max(
      1,
      ...values
    );


  const step =
    values.length === 1
      ? width
      : width /
        (
          values.length - 1
        );


  return values
    .map(
      (
        value,
        index
      ) => {

        const x =
          index * step;


        const normalized =
          value / maxValue;


        const y =
          height -
          padding -
          (
            normalized *
            (
              height -
              padding * 2
            )
          );


        return `${
          index === 0
            ? "M"
            : "L"
        }${x.toFixed(2)} ${y.toFixed(2)}`;

      }
    )
    .join(" ");

}


function createChartFillPath(
  values: number[]
) {

  if (
    !values.length
  ) {
    return "";
  }


  const linePath =
    createChartPath(
      values
    );


  return `
    ${linePath}
    L 360 120
    L 0 120
    Z
  `;

}


function ProfileModal({
  profile,
  vibeTimeSeconds = 0,
  weeklyActivity = [
    0,
    0,
    0,
    0,
    0,
    0,
    0
  ],
  isOnline = true,
  onSave,
  onClose
}: Props) {

  const [name, setName] =
    useState(
      profile.name
    );


  const [avatar, setAvatar] =
    useState(
      profile.avatar
    );


  const [isEditing, setIsEditing] =
    useState(false);


  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );


  function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>
  ) {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      alert(
        "Выбери изображение"
      );


      event.target.value =
        "";


      return;

    }


    if (
      file.size >
      5 * 1024 * 1024
    ) {

      alert(
        "Изображение должно быть меньше 5 MB"
      );


      event.target.value =
        "";


      return;

    }


    const reader =
      new FileReader();


    reader.onload = () => {

      if (
        typeof reader.result ===
        "string"
      ) {

        setAvatar(
          reader.result
        );

      }

    };


    reader.onerror = () => {

      alert(
        "Не удалось загрузить изображение"
      );

    };


    reader.readAsDataURL(
      file
    );


    event.target.value =
      "";

  }


  function openAvatarPicker() {

    fileInputRef.current?.click();

  }


  function saveProfile() {

    const cleanName =
      name
        .trim()
        .slice(
          0,
          30
        );


    if (!cleanName) {

      alert(
        "Введи имя"
      );


      return;

    }


    const updatedProfile: ProfileData = {

      name:
        cleanName,

      avatar:
        avatar || ""

    };


    onSave(
      updatedProfile
    );


    setName(
      cleanName
    );


    setAvatar(
      avatar || ""
    );


    setIsEditing(
      false
    );

  }


  function cancelEditing() {

    setName(
      profile.name
    );


    setAvatar(
      profile.avatar
    );


    setIsEditing(
      false
    );

  }


  const avatarLetter =
    (
      name ||
      "G"
    )
      .charAt(0)
      .toUpperCase();


  const username =
    (
      name ||
      "guest"
    )
      .toLowerCase()
      .replace(
        /\s+/g,
        "_"
      )
      .replace(
        /[^a-z0-9_а-яё]/gi,
        ""
      )
      .slice(
        0,
        24
      ) ||
    "guest";


  const chartValues =
    weeklyActivity.length
      ? weeklyActivity
      : [
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ];


  const chartLine =
    createChartPath(
      chartValues
    );


  const chartFill =
    createChartFillPath(
      chartValues
    );


  const dayLabels = [
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT",
    "SUN"
  ];


  return (

    <div
      className="profile-modal-backdrop"
      onClick={onClose}
    >

      <div
        className="profile-modal profile-modal-full"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

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
              onClick={() =>
                setIsEditing(true)
              }
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


        <div className="profile-content">


          <section className="profile-hero">

            <button
              type="button"
              className="profile-main-avatar"
              onClick={() => {

                if (isEditing) {
                  openAvatarPicker();
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

              <span
                className={
                  `profile-status-dot${
                    isOnline
                      ? ""
                      : " offline"
                  }`
                }
              />

              {isOnline
                ? "Online"
                : "Offline"}

            </div>

          </section>


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
              Enter your bio here...
            </p>

          </section>


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
                    openAvatarPicker();
                  }

                }}
                aria-label="Добавить фото"
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


              <div className="profile-stat-row">

                <div className="profile-stat-label">

                  <span className="profile-stat-icon">
                    ◷
                  </span>

                  Vibe Time

                </div>


                <div className="profile-stat-value profile-vibe-time-value">
                  {formatVibeTime(
                    vibeTimeSeconds
                  )}
                </div>

              </div>


            </div>

          </section>


          <section className="profile-activity">

            <div className="profile-activity-tabs">

              <button
                type="button"
                className="profile-activity-tab active"
                aria-label="График"
              >
                ▥
              </button>


              <button
                type="button"
                className="profile-activity-tab"
                aria-label="Сетка"
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


                {chartFill && (

                  <path
                    d={chartFill}
                    fill="url(#profileChartFill)"
                  />

                )}


                {chartLine && (

                  <path
                    d={chartLine}
                    fill="none"
                    stroke="url(#profileChartGradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                )}

              </svg>


              <div className="profile-chart-labels">

                {dayLabels.map(
                  label => (

                    <span
                      key={label}
                    >
                      {label}
                    </span>

                  )
                )}

              </div>

            </div>

          </section>

        </div>


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
                  onClick={
                    openAvatarPicker
                  }
                  aria-label="Изменить аватар"
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
                    setName(
                      event.target.value
                    )
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
                onClick={
                  saveProfile
                }
              >
                SAVE
              </button>


              <button
                type="button"
                className="profile-cancel-button"
                onClick={
                  cancelEditing
                }
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
