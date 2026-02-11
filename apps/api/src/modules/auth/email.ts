import nodemailer from "nodemailer";
import { config } from "../../config/env";
import { logger } from "../../lib/logger";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    logger.info("SMTP not configured; OTP will be logged only");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort ?? 587,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  return transporter;
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const transport = getTransporter();
  const body = `Your Waitr login code is: ${otp}. It expires in ${config.otpExpiryMinutes} minutes.`;
  if (transport) {
    await transport.sendMail({
      from: config.mailFrom,
      to,
      subject: "Your Waitr login code",
      text: body,
    });
  } else {
    logger.info("OTP email (no SMTP)", { to, otp });
  }
}
