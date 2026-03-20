import React from 'react';

const ProtectedRoute = ({ canAccess, children }) => {
  if (!canAccess) {
    return (
      <section className="page centered">
        <h2>Access restricted</h2>
        <p>Please login with required permission.</p>
      </section>
    );
  }
  return children;
};

export default ProtectedRoute;
