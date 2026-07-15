import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// No pinned apiVersion: defaults to the account's configured API version,
// per Stripe's own guidance to track "latest" rather than hardcode a string
// that drifts from the SDK over time.
export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
