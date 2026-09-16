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

  const [name, setName] =
    useState(
      profile.name
    );


  const [avatar, setAvatar] =
    useState(
      profile.avatar
    );


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
      !file.type.startsWith("image/")
    ) {

      alert(
        "Выбери изображение"
      );

      return;

    }


    /*
      Ограничиваем размер исходного файла.
    */

    if (
      file.size > 5 * 1024 * 1024
    ) {

      alert(
        "Изображение должно быть меньше 5 MB"
      );

      return;

    }


    const reader =
      new FileReader();


    reader.onload =
      () => {

        if (
          typeof reader.result ===
          "string"
        ) {

          setAvatar(
            reader.result
          );

        }

      };


    reader.readAsDataURL(
      file
    );

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


    onSave({

      name:
        cleanName,

      avatar:
        avatar || ""

    });

  }


  const avatarLetter =
    (
      name ||
      "G"
    )
      .charAt(0)
      .toUpperCase();


  return (

    <div
      className="profile-modal-backdrop"
      onClick={onClose}
    >

      <div
        className="profile-modal"
        onClick={
          event =>
            event.stopPropagation()
        }
      >

        <button
          type="button"
          className="profile-modal-close"
          onClick={onClose}
        >
          ×
        </button>


        <div className="profile-modal-label">
          YOUR PROFILE
        </div>


        <h2>
          Твой профиль
        </h2>


        <p className="profile-modal-description">
          Имя и аватар будут видны
          другим людям в комнате.
        </p>


        <button
          type="button"
          className="profile-avatar-editor"
          onClick={() =>
            fileInputRef.current?.click()
          }
          aria-label="Изменить аватар"
        >

          {avatar ? (

            <img
              src={avatar}
              alt="Аватар"
              className="profile-avatar-image"
            />

          ) : (

            <span>
              {avatarLetter}
            </span>

          )}


          <div className="profile-avatar-edit">
            ✎
          </div>

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


        <div className="profile-field">

          <label>
            ИМЯ
          </label>


          <input
            type="text"
            value={name}
            onChange={
              event =>
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
          onClick={saveProfile}
        >
          СОХРАНИТЬ
        </button>


        <button
          type="button"
          className="profile-cancel-button"
          onClick={onClose}
        >
          ОТМЕНА
        </button>


      </div>

    </div>

  );

}


export default ProfileModal;
