import React from 'react';

const StatTile = ({ label, value }) => (
  <article className="stat-tile">
    <p>{label}</p>
    <h3>{value}</h3>
  </article>
);

export default StatTile;
