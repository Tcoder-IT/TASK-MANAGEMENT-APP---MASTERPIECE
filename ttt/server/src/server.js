import { app, connectDB } from './app.js';
import { env } from './config/env.js';
import { disconnectDB } from './config/db.js';

let server;

async function start() {
  try {
    await connectDB();

    server = app.listen(env.PORT, () => {
      console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('Server closed');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('Forced shutdown');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
      shutdown('UNHANDLED_REJECTION');
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { app };