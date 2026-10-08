/**
 * Where the Express API lives.
 *
 * Set NEXT_PUBLIC_API_URL in frontend/.env to point at a deployed backend;
 * the localhost default only covers running both halves on one machine.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3030';
