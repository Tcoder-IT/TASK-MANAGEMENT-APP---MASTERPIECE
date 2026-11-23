const { MongoMemoryServer } = require('mongodb-memory-server');

const START_PORT = Number(process.env.TEST_MONGO_PORT || 27555);
const MAX_ATTEMPTS = 10;

async function startTestMongo() {
  const errors = [];
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const port = START_PORT + i;
    try {
      return await MongoMemoryServer.create({
        instance: { port, ip: '127.0.0.1' },
      });
    } catch (err) {
      const reason = err.code || String(err.message).split('\n')[0];
      errors.push('port ' + port + ': ' + reason);
    }
  }
  throw new Error('Could not start MongoMemoryServer. Attempts:\n' + errors.join('\n'));
}

module.exports = { startTestMongo };
