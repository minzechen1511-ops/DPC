import dotenv from 'dotenv';
import { startStandaloneServer } from './server/standaloneApp.ts';

dotenv.config();

startStandaloneServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
