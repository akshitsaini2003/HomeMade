import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import client from '../api/client';
import CountdownBadge from '../components/common/CountdownBadge';
import Loader from '../components/common/Loader';
import MenuCard from '../components/menu/MenuCard';
import { getErrorMessage } from '../utils/http';

const HomePage = () => {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await client.get('/menus/tomorrow');
        setMenu(data.data);
      } catch (err) {
        setError(getErrorMessage(err, 'Tomorrow menu is not live yet'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <section className="grid" style={{ gap: 20 }}>
      <div className="hero">
        <article className="hero-card">
          <h1>Home-cooked meals for campus life.</h1>
          <p>Book today for tomorrow. Pickup or dine-in only.</p>
          <p>Lunch: 12 PM - 2 PM | Dinner: 7 PM - 9 PM</p>
        </article>
        <article className="hero-info">
          <h3>Tomorrow availability</h3>
          {menu ? (
            <>
              <p><strong>Date:</strong> {dayjs(menu.date).format('DD MMM YYYY')}</p>
              <p className={`badge ${menu.remainingPlates <= 15 ? 'low' : ''}`}>
                Only {menu.remainingPlates} plates left
              </p>
              <div style={{ marginTop: 12 }}>
                <CountdownBadge cutoffTime={menu.cutoffTime} />
              </div>
              <p style={{ color: '#5f6474' }}>Price per plate: INR {menu.platePrice}</p>
            </>
          ) : (
            <p>Menu will be published soon.</p>
          )}
        </article>
      </div>

      <section className="page">
        <h2>Tomorrow menu preview</h2>
        {loading && <Loader text="Fetching menu" />}
        {!loading && error && <p className="error-text">{error}</p>}
        {!loading && menu && (
          <div className="menu-grid">
            {menu.items.map((item) => (
              <MenuCard key={item.name} item={item} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
};

export default HomePage;
