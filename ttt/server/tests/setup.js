const dotenv = require('dotenv');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.API_VERSION = 'v1';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars-long';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.COOKIE_DOMAIN = 'localhost';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.RATE_LIMIT_AUTH_MAX_REQUESTS = '10';
process.env.BODY_LIMIT = '10kb';

let mongod;

beforeAll(async () => {
  // Use a more robust configuration for Windows to avoid port conflicts and crashes
  mongod = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1',
      port: 0,
      args: [
        '--bind_ip', '127.0.0.1',
        '--noauth',
        '--nojournal',
        '--noprealloc',
        '--smallfiles'
      ],
    },
    autoStart: true,
    binary: {
      version: '4.4.0', // Use older MongoDB version for better Windows compatibility
    },
  });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});