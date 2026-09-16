type RoomCardProps = {
  title: string;
  users: number;
};


function RoomCard({
  title,
  users
}: RoomCardProps) {


  return (

    <div className="room-card">

      <h2>
        {title}
      </h2>


      <p>
        👥 {users} участников
      </p>


      <button>
        Войти
      </button>

    </div>

  );

}


export default RoomCard;
