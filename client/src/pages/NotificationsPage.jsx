import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import client from '../api/client';
import Loader from '../components/common/Loader';
import { useApp } from '../context/AppContext';
import { getErrorMessage } from '../utils/http';

const NotificationsPage = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const { setNotificationCount, loadNotificationCount } = useApp();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/notifications?limit=100');
      setItems(data.data.items);
      setNotificationCount(data.data.unreadCount || 0);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    try {
      await client.patch(`/notifications/${id}/read`);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update notification'));
    }
  };

  const markAll = async () => {
    try {
      await client.patch('/notifications/read-all');
      await loadNotificationCount();
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to mark all as read'));
    }
  };

  return (
    <section className="page">
      <div className="panel-head">
        <h2>Notifications</h2>
        <button type="button" className="btn ghost" onClick={markAll}>Mark all read</button>
      </div>

      {loading ? (
        <Loader text="Loading notifications" />
      ) : items.length === 0 ? (
        <p>No notifications available.</p>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {items.map((item) => (
            <article
              key={item._id}
              className="panel"
              style={{
                background: item.isRead ? '#fff' : '#fff8e9',
                borderColor: item.isRead ? '#f2d9c0' : '#ffd08a'
              }}
            >
              <div className="panel-head">
                <strong>{item.title}</strong>
                {!item.isRead && (
                  <button type="button" className="btn tiny" onClick={() => markRead(item._id)}>Mark read</button>
                )}
              </div>
              <p>{item.message}</p>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default NotificationsPage;
