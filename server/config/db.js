const mongoose = require('mongoose');

let isConnected = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMongoUri() {
  // Prefer explicit env var, otherwise default to IPv4 localhost
  // (avoids ::1 issues on some Windows setups).
  return (
    process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/seminaryProjectDB'
  );
}

function logDbHelp() {
  console.log(
    [
      'ℹ️  MongoDB is not reachable on localhost:27017.',
      '   - If you installed MongoDB as a Windows service, start the "MongoDB" service.',
      '   - If you use Docker, run a mongo container and map port 27017.',
      '   - Or set MONGO_URI to your MongoDB connection string (Atlas/local).',
    ].join('\n')
  );
}

async function connectDB(options = {}) {
  if (isConnected) return mongoose.connection;

  const mongoUri = getMongoUri();
  const {
    maxRetries = Infinity,
    initialDelayMs = 500,
    maxDelayMs = 10000,
    failFast = process.env.DB_FAIL_FAST === 'true',
  } = options;

  // Avoid adding multiple listeners in nodemon restarts.
  if (!mongoose.connection.listenerCount('connected')) {
    mongoose.connection.on('connected', () => {
      console.log('✨ Server connected to MongoDB');
    });
    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.log('⚠️  MongoDB disconnected');
    });
  }

  let attempt = 0;
  let delayMs = initialDelayMs;

  // Retry loop: do not crash the server; keep trying until DB is up.
  // If DB_FAIL_FAST=true, throw on first failure.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
        family: 4,
      });
      isConnected = true;
      return mongoose.connection;
    } catch (err) {
      console.log(
        `❌ DB connection failed (attempt ${attempt})`,
        err?.message ?? err
      );
      logDbHelp();

      if (failFast || attempt >= maxRetries) {
        throw err;
      }

      await sleep(delayMs);
      delayMs = Math.min(maxDelayMs, Math.floor(delayMs * 1.7));
    }
  }
}

module.exports = {
  connectDB,
};
