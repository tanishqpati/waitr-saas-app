import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/db";
import { sessionStore } from "../../config/sessionStore";
import { config } from "../../config/env";
import { logger } from "../../lib/logger";
import { sendOtpEmail } from "./email";

const OTP_LENGTH = 6;
const OTP_CHARS = "0123456789";

function generateOtp(): string {
  let otp = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += OTP_CHARS[Math.floor(Math.random() * OTP_CHARS.length)];
  }
  return otp;
}

/** Access token payload (short-lived, in response body only). */
export type AccessPayload = { sub: string; email: string };

/** Refresh token payload (long-lived, in httpOnly cookie only; jti stored in session store). */
export type RefreshPayload = { sub: string; email: string; jti: string };

export async function sendOtp(email: string): Promise<void> {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);
  await prisma.otpCode.create({
    data: { identifier: email.toLowerCase().trim(), otp, expiresAt },
  });
  const isDev = config.nodeEnv !== "production";
  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    if (isDev) {
      logger.info("OTP (dev – email send failed, use this code)", { email: email.toLowerCase(), otp });
      return;
    }
    throw err;
  }
  logger.auth("send_otp", { email: email.toLowerCase() });
}

export async function verifyOtp(email: string, otp: string): Promise<{ accessToken: string; refreshToken: string }> {
  const identifier = email.toLowerCase().trim();
  const record = await prisma.otpCode.findFirst({
    where: { identifier, otp },
    orderBy: { expiresAt: "desc" },
  });
  if (!record || record.expiresAt < new Date()) {
    throw Object.assign(new Error("Invalid or expired OTP"), { statusCode: 400 });
  }
  await prisma.otpCode.deleteMany({ where: { identifier } });

  let user = await prisma.user.findUnique({ where: { email: identifier } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: identifier, name: null },
    });
  }

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email } as AccessPayload,
    config.jwtSecret,
    { expiresIn: config.accessTokenExpiry }
  );

  const jti = crypto.randomUUID();
  const refreshToken = jwt.sign(
    { sub: user.id, email: user.email, jti } as RefreshPayload,
    config.jwtSecret,
    { expiresIn: config.refreshTokenExpiry }
  );

  const refreshTtlSeconds = 14 * 24 * 60 * 60; // 14 days
  await sessionStore.set(jti, user.id, refreshTtlSeconds);

  logger.auth("verify_otp", { userId: user.id, email: user.email });
  return { accessToken, refreshToken };
}

/** Validate refresh token and issue new access token; optionally rotate refresh token. */
export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: RefreshPayload;
  try {
    payload = jwt.verify(refreshToken, config.jwtSecret) as RefreshPayload;
  } catch {
    throw Object.assign(new Error("Invalid or expired refresh token"), { statusCode: 401 });
  }
  const { sub, email, jti } = payload;
  if (!jti) {
    throw Object.assign(new Error("Invalid refresh token"), { statusCode: 401 });
  }

  const storedUserId = await sessionStore.get(jti);
  if (!storedUserId || storedUserId !== sub) {
    throw Object.assign(new Error("Refresh token revoked or invalid"), { statusCode: 401 });
  }

  const accessToken = jwt.sign(
    { sub, email } as AccessPayload,
    config.jwtSecret,
    { expiresIn: config.accessTokenExpiry }
  );

  // Token rotation: issue new refresh token and invalidate old one
  await sessionStore.delete(jti);
  const newJti = crypto.randomUUID();
  const newRefreshToken = jwt.sign(
    { sub, email, jti: newJti } as RefreshPayload,
    config.jwtSecret,
    { expiresIn: config.refreshTokenExpiry }
  );
  const refreshTtlSeconds = 14 * 24 * 60 * 60;
  await sessionStore.set(newJti, sub, refreshTtlSeconds);

  logger.auth("refresh", { userId: sub });
  return { accessToken, refreshToken: newRefreshToken };
}

/** Invalidate refresh token (logout). */
export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  try {
    const payload = jwt.verify(refreshToken, config.jwtSecret) as RefreshPayload;
    if (payload.jti) await sessionStore.delete(payload.jti);
  } catch {
    // ignore invalid/expired
  }
}
