import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './[...slug].js';

export default async function indexHandler(req: VercelRequest, res: VercelResponse) {
  return handler(req, res);
}

