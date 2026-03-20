import React from 'react';
import useCountdown from '../../hooks/useCountdown';

const CountdownBadge = ({ cutoffTime }) => {
  const { label, isExpired } = useCountdown(cutoffTime);

  return (
    <div className={`countdown ${isExpired ? 'expired' : ''}`}>
      {isExpired ? 'Booking closed' : `Booking closes in ${label}`}
    </div>
  );
};

export default CountdownBadge;
