import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.info(`JWT_SECRET present: ${Boolean(process.env.JWT_SECRET)}`);
console.info(`OPENAI_API_KEY present: ${Boolean(process.env.OPENAI_API_KEY)}`);

const { default: app } = require('./app') as { default: import('./app').default };
const { env } = require('./config/env') as typeof import('./config/env');

const startServer = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Connected to MongoDB');
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
