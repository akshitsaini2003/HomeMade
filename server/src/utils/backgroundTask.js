const runInBackground = (label, task) => {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error(`[BackgroundTask:${label}]`, error?.message || error);
    });
};

module.exports = {
  runInBackground
};
