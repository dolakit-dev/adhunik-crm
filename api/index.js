const { startServer } = require('../server');

let appPromise;

module.exports = async (req, res) => {
  if (!appPromise) {
    appPromise = startServer({ serverless: true });
  }

  const app = await appPromise;
  return app(req, res);
};