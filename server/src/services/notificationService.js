const Notification = require('../models/Notification');

const createNotification = async ({ userId, title, message, type = 'system', meta = {} }) => {
  return Notification.create({ userId, title, message, type, meta });
};

const createBulkNotifications = async ({ userIds, title, message, type = 'system', meta = {} }) => {
  if (!userIds.length) return [];
  return Notification.insertMany(
    userIds.map((userId) => ({ userId, title, message, type, meta }))
  );
};

module.exports = {
  createNotification,
  createBulkNotifications
};
