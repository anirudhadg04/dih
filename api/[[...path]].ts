// Import the TypeScript source so Vercel bundles the Express application and
// its local dependencies into this function. Importing the committed root
// server.js artifact left Vercel resolving its stale extensionless ESM imports.
import handler from '../server.ts';

export default handler;
