const dayjs = require('dayjs');

const getTomorrowRange = () => {
  const start = dayjs().add(1, 'day').startOf('day').toDate();
  const end = dayjs().add(1, 'day').endOf('day').toDate();
  return { start, end };
};

const isTomorrow = (date) => {
  const d = dayjs(date);
  return d.isSame(dayjs().add(1, 'day'), 'day');
};

const formatHumanDate = (date) => dayjs(date).format('DD MMM YYYY, hh:mm A');

const isBeforeCutoff = (cutoffTime) => dayjs().isBefore(dayjs(cutoffTime));

module.exports = {
  getTomorrowRange,
  isTomorrow,
  formatHumanDate,
  isBeforeCutoff
};
