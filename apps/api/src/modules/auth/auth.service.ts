import jwt from "jsonwebtoken";
import { prisma } from "../../config/db";
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

export async function sendOtp(email: string): Promise<void> {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60 * 1000);
  await prisma.otpCode.create({
    data: { identifier: email.toLowerCase().trim(), otp, expiresAt },
  });
  await sendOtpEmail(email, otp);
  logger.auth("send_otp", { email: email.toLowerCase() });
}

export async function verifyOtp(email: string, otp: string): Promise<{ token: string }> {
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

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
  logger.auth("verify_otp", { userId: user.id, email: user.email });
  return { token };
}
