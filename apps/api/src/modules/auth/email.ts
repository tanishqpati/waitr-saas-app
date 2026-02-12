import { Resend } from "resend";
import { config } from "../../config/env";
import { logger } from "../../lib/logger";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  if (!config.resendApiKey) {
    logger.info("Resend not configured; OTP will be logged only");
    return null;
  }
  resendClient = new Resend(config.resendApiKey);
  return resendClient;
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const client = getResend();
  const body = `Your Waitr login code is: ${otp}. It expires in ${config.otpExpiryMinutes} minutes.`;
  if (client) {
    const { error } = await client.emails.send({
      from: config.mailFrom,
      to,
      subject: "Your Waitr login code",
      text: body,
    });
    if (error) {
      logger.error("Resend send failed", error);
      throw Object.assign(new Error("Failed to send email"), { statusCode: 500 });
    }
  } else {
    logger.info("OTP email (no Resend API key)", { to, otp });
  }
}
