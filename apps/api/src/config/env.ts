function env(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) throw new Error(`Missing env: ${key}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: env("JWT_SECRET", "dev-secret-change-in-production"),
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES ?? 10),
  resendApiKey: process.env.RESEND_API_KEY,
  mailFrom: process.env.MAIL_FROM ?? "Waitr <onboarding@resend.dev>",
  /** Access token expiry (e.g. "15m"). */
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY ?? "15m",
  /** Refresh token expiry (e.g. "14d"). */
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY ?? "14d",
  /** Refresh token cookie name. */
  refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? "waitr_rt",
  /** Redis URL for session store. If unset, in-memory store is used. */
  redisUrl: process.env.REDIS_URL,
  /** Allowed CORS origin (for credentials). Default development. */
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  /** Upstash Redis (REST) for menu cache, cart, rate limiting. */
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
};
