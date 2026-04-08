import mongoose from 'mongoose';

import { env } from './config/env';
import app from './app';

const startServer = async () => {
  try {
    console.log(`[Mongo] Effective MONGO_URI: ${env.MONGO_URI}`);
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
    process.exit(1);
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

startServer();
