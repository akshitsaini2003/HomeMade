import React from 'react';

const MenuCard = ({ item }) => (
  <article className="menu-card">
    <img src={item.image} alt={item.name} loading="lazy" />
    <div className="menu-card-body">
      <h3>{item.name}</h3>
      <p>{item.description}</p>
    </div>
  </article>
);

export default MenuCard;
