import mongoose from 'mongoose';

import { env } from './config/env';
import app from './app';

const sanitizeMongoUriForLogging = (mongoUri: string) => {
  try {
    const url = new URL(mongoUri);
    const databaseName = url.pathname.replace(/^\//, '') || '(default)';
    const replicaSet = url.searchParams.get('replicaSet') ?? 'none';

    return {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname || 'unknown',
      port: url.port || '(default)',
      database: databaseName,
      replicaSet,
    };
  } catch {
    return {
      protocol: 'invalid',
      host: 'invalid',
      port: 'invalid',
      database: 'invalid',
      replicaSet: 'invalid',
    };
  }
};

const startServer = async () => {
  try {
    const sanitizedMongoUri = sanitizeMongoUriForLogging(env.MONGO_URI);
    console.log(
      `[Mongo] Effective MONGO_URI (sanitized): protocol=${sanitizedMongoUri.protocol} host=${sanitizedMongoUri.host} port=${sanitizedMongoUri.port} database=${sanitizedMongoUri.database} replicaSet=${sanitizedMongoUri.replicaSet}`,
    );
    await mongoose.connect(env.MONGO_URI);

    const { host, port, name } = mongoose.connection;
    const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
    const transactionsSupported = Boolean(hello?.setName && hello?.logicalSessionTimeoutMinutes);

    console.log(
      `[Mongo] Connected to host=${host}:${port} db=${name} replicaSet=${hello?.setName ?? 'none'}`,
    );
    console.log(
      `[Mongo] Transactions supported: ${transactionsSupported ? 'yes' : 'no'} (isWritablePrimary=${hello?.isWritablePrimary ?? 'unknown'})`,
    );

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    if (error instanceof Error && /ECONNREFUSED|ReplicaSetNoPrimary/i.test(error.message)) {
      console.error(
        '[Mongo] Could not connect to MongoDB. For local development run: docker compose up -d mongo mongo-init',
      );
      console.error(
        '[Mongo] Then verify with: docker compose ps (mongo should be healthy/running on localhost:27018).',
      );
    }
    process.exit(1);
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

startServer();
