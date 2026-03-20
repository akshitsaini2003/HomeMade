import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

const useCountdown = (targetTime) => {
  const [remaining, setRemaining] = useState(() => {
    const diff = dayjs(targetTime).diff(dayjs(), 'second');
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    if (!targetTime) return undefined;

    const timer = setInterval(() => {
      const diff = dayjs(targetTime).diff(dayjs(), 'second');
      setRemaining(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return {
    remaining,
    label: `${hours}h ${minutes}m ${seconds}s`,
    isExpired: remaining <= 0
  };
};

export default useCountdown;
