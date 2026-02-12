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
};
