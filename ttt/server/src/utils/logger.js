import pino from 'pino';

const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: isTest ? 'silent' : 'info',
  transport: isTest ? undefined : {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
});

export default logger;