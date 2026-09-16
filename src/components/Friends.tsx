import {
  useEffect,
  useState
} from "react";

import {
  acceptFriendRequest,
  declineFriendRequest,
  getCurrentUser,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  FriendRequest,
  FriendUser,
  FriendsData,
  VibeUser
} from "../socket";


type Props = {
  onClose?: () => void;
};


function Friends({
  onClose
}: Props) {

  const [currentUser, setCurrentUser] =
    useState<VibeUser | null>(
      getCurrentUser()
    );


  const [friends, setFriends] =
    useState<FriendUser[]>(
      []
    );


  const [incoming, setIncoming] =
    useState<FriendRequest[]>(
      []
    );


  const [outgoing, setOutgoing] =
    useState<FriendRequest[]>(
      []
    );


  const [search, setSearch] =
    useState("");


  const [results, setResults] =
    useState<VibeUser[]>(
      []
    );


  const [activeTab, setActiveTab] =
    useState<
      "friends" |
      "requests" |
      "search"
    >(
      "friends"
    );


  useEffect(() => {

    function handleUser(
      event: Event
    ) {

      const customEvent =
        event as CustomEvent<VibeUser>;


      setCurrentUser(
        customEvent.detail
      );

    }


    function handleFriends(
      event: Event
    ) {

      const customEvent =
        event as CustomEvent<FriendsData>;


      const data =
        customEvent.detail;


      setFriends(
        data?.friends || []
      );


      setIncoming(
        data?.incoming || []
      );


      setOutgoing(
        data?.outgoing || []
      );

    }


    function handleSearch(
      event: Event
    ) {

      const customEvent =
        event as CustomEvent<VibeUser[]>;


      setResults(
        customEvent.detail || []
      );

    }


    window.addEventListener(
      "vibe-user-registered",
      handleUser
    );


    window.addEventListener(
      "vibe-friends-data",
      handleFriends
    );


    window.addEventListener(
      "vibe-user-search-results",
      handleSearch
    );


    return () => {

      window.removeEventListener(
        "vibe-user-registered",
        handleUser
      );


      window.removeEventListener(
        "vibe-friends-data",
        handleFriends
      );


      window.removeEventListener(
        "vibe-user-search-results",
        handleSearch
      );

    };

  }, []);


  useEffect(() => {

    const timer =
      window.setTimeout(
        () => {

          const query =
            search.trim();


          if (
            query.length < 2
          ) {

            setResults([]);

            return;

          }


          searchUsers(
            query
          );

        },
        350
      );


    return () => {

      window.clearTimeout(
        timer
      );

    };

  }, [
    search
  ]);


  function getLetter(
    name: string
  ) {

    return (
      name ||
      "G"
    )
      .charAt(0)
      .toUpperCase();

  }


  function isFriend(
    userId: string
  ) {

    return friends.some(
      friend =>
        friend.id ===
        userId
    );

  }


  function hasOutgoingRequest(
    userId: string
  ) {

    return outgoing.some(
      request =>
        request.userId ===
        userId
    );

  }


  function copyId() {

    if (
      !currentUser?.id
    ) {

      return;

    }


    navigator.clipboard
      ?.writeText(
        currentUser.id
      );

  }


  return (

    <div className="friends-page">


      <div className="friends-header">


        <div>

          <div className="friends-label">
            VIBE SOCIAL
          </div>


          <h2>
            FRIENDS
          </h2>


        </div>


        {onClose && (

          <button
            type="button"
            className="friends-close"
            onClick={
              onClose
            }
          >
            ×
          </button>

        )}

      </div>


      {currentUser && (

        <div className="friends-my-id">


          <div className="friends-my-id-info">

            <span>
              YOUR VIBE ID
            </span>


            <strong>
              {currentUser.id}
            </strong>

          </div>


          <button
            type="button"
            className="friends-copy-id"
            onClick={
              copyId
            }
          >
            COPY
          </button>


        </div>

      )}


      <div className="friends-tabs">


        <button
          type="button"
          className={
            activeTab === "friends"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "friends"
            )
          }
        >
          FRIENDS

          <span>
            {friends.length}
          </span>

        </button>


        <button
          type="button"
          className={
            activeTab === "requests"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "requests"
            )
          }
        >
          REQUESTS

          {incoming.length > 0 && (

            <span>
              {incoming.length}
            </span>

          )}

        </button>


        <button
          type="button"
          className={
            activeTab === "search"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "search"
            )
          }
        >
          SEARCH
        </button>


      </div>


      {activeTab === "friends" && (

        <div className="friends-list">


          {friends.length === 0 ? (

            <div className="friends-empty">

              <div className="friends-empty-icon">
                ♡
              </div>


              <strong>
                Пока нет друзей
              </strong>


              <p>
                Найди кого-нибудь
                через SEARCH и
                добавь в друзья.
              </p>

            </div>

          ) : (

            friends.map(
              friend => (

                <div
                  key={
                    friend.id
                  }
                  className="friend-card"
                >


                  <div className="friend-avatar">

                    {friend.avatar ? (

                      <img
                        src={
                          friend.avatar
                        }
                        alt=""
                      />

                    ) : (

                      <span>
                        {getLetter(
                          friend.name
                        )}
                      </span>

                    )}

                  </div>


                  <div className="friend-info">

                    <strong>
                      {friend.name}
                    </strong>


                    <span>
                      {friend.id}
                    </span>


                    <small>
                      ● ONLINE
                    </small>

                  </div>


                  <button
                    type="button"
                    className="friend-remove"
                    onClick={() =>
                      removeFriend(
                        friend.id
                      )
                    }
                  >
                    REMOVE
                  </button>


                </div>

              )
            )

          )}

        </div>

      )}


      {activeTab === "requests" && (

        <div className="friends-list">


          {incoming.length === 0 ? (

            <div className="friends-empty">

              <div className="friends-empty-icon">
                ✓
              </div>


              <strong>
                Нет новых заявок
              </strong>


              <p>
                Здесь появятся
                запросы на дружбу.
              </p>

            </div>

          ) : (

            incoming.map(
              request => (

                <div
                  key={
                    request.id
                  }
                  className="friend-card"
                >


                  <div className="friend-avatar">

                    {request.avatar ? (

                      <img
                        src={
                          request.avatar
                        }
                        alt=""
                      />

                    ) : (

                      <span>
                        {getLetter(
                          request.name
                        )}
                      </span>

                    )}

                  </div>


                  <div className="friend-info">

                    <strong>
                      {request.name}
                    </strong>


                    <span>
                      {request.userId}
                    </span>

                  </div>


                  <div className="friend-request-actions">

                    <button
                      type="button"
                      className="friend-accept"
                      onClick={() =>
                        acceptFriendRequest(
                          request.id
                        )
                      }
                    >
                      ACCEPT
                    </button>


                    <button
                      type="button"
                      className="friend-decline"
                      onClick={() =>
                        declineFriendRequest(
                          request.id
                        )
                      }
                    >
                      DECLINE
                    </button>

                  </div>


                </div>

              )
            )

          )}


          {outgoing.length > 0 && (

            <div className="friends-outgoing">

              <div className="friends-subtitle">
                SENT REQUESTS
              </div>


              {outgoing.map(
                request => (

                  <div
                    key={
                      request.id
                    }
                    className="friend-card friend-card-small"
                  >

                    <div className="friend-avatar">

                      {request.avatar ? (

                        <img
                          src={
                            request.avatar
                          }
                          alt=""
                        />

                      ) : (

                        <span>
                          {getLetter(
                            request.name
                          )}
                        </span>

                      )}

                    </div>


                    <div className="friend-info">

                      <strong>
                        {request.name}
                      </strong>


                      <span>
                        {request.userId}
                      </span>

                    </div>


                    <div className="friend-pending">
                      PENDING
                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      )}


      {activeTab === "search" && (

        <div className="friends-search">


          <div className="friends-search-box">

            <span>
              🔎
            </span>


            <input
              value={
                search
              }
              onChange={
                event =>
                  setSearch(
                    event.target.value
                  )
              }
              placeholder="VIBE ID или имя..."
              autoComplete="off"
            />

          </div>


          {search.trim().length < 2 ? (

            <div className="friends-search-hint">

              Введи минимум 2 символа,
              чтобы найти пользователя.

            </div>

          ) : results.length === 0 ? (

            <div className="friends-empty">

              <div className="friends-empty-icon">
                ?
              </div>


              <strong>
                Никого не нашли
              </strong>


              <p>
                Попробуй VIBE ID
                или другое имя.
              </p>

            </div>

          ) : (

            <div className="friends-list">

              {results.map(
                user => {

                  const self =
                    currentUser?.id ===
                    user.id;


                  const friend =
                    isFriend(
                      user.id
                    );


                  const pending =
                    hasOutgoingRequest(
                      user.id
                    );


                  return (

                    <div
                      key={
                        user.id
                      }
                      className="friend-card"
                    >


                      <div className="friend-avatar">

                        {user.avatar ? (

                          <img
                            src={
                              user.avatar
                            }
                            alt=""
                          />

                        ) : (

                          <span>
                            {getLetter(
                              user.name
                            )}
                          </span>

                        )}

                      </div>


                      <div className="friend-info">

                        <strong>
                          {user.name}
                        </strong>


                        <span>
                          {user.id}
                        </span>

                      </div>


                      {!self &&
                        !friend &&
                        !pending && (

                          <button
                            type="button"
                            className="friend-add"
                            onClick={() =>
                              sendFriendRequest(
                                user.id
                              )
                            }
                          >
                            + ADD
                          </button>

                        )}


                      {friend && (

                        <div className="friend-state">
                          FRIENDS
                        </div>

                      )}


                      {pending && (

                        <div className="friend-pending">
                          SENT
                        </div>

                      )}


                      {self && (

                        <div className="friend-state">
                          YOU
                        </div>

                      )}

                    </div>

                  );

                }
              )}

            </div>

          )}

        </div>

      )}

    </div>

  );

}


export default Friends;
