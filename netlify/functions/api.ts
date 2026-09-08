import serverless from "serverless-http";
import { createApp } from "../../server";

// Keep one initialized app per warm function instance. Netlify may create more
// instances under load; durable state must therefore come from Supabase rather
// than process memory or the local filesystem.
const appPromise = createApp({ listen: false, serveFrontend: false });

export const handler = async (event: unknown, context: unknown) => {
  const app = await appPromise;
  return serverless(app)(event, context);
};