import React from 'react';

const Loader = ({ text = 'Loading...' }) => (
  <div className="loader-wrap">
    <span className="loader" />
    <p>{text}</p>
  </div>
);

export default Loader;
