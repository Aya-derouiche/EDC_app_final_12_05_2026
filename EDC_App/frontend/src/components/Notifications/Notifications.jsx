import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { UserContext } from "../Connexion/UserProvider";

const Notifications = () => {
  const { user } = useContext(UserContext);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`/api/notifications/${user.id}`);
        setNotifications(res.data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };
    fetchNotifications();
  }, [user.id]);

  return (
    <div>
      <h2>Notifications</h2>
      <ul>
        {notifications.map((notif) => (
          <li key={notif.id}>{notif.message}</li>
        ))}
      </ul>
    </div>
  );1
};

export default Notifications;
