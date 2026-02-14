import { z } from "zod";
import { otpSchema } from "./schemas";

export const sendOtpBody = z.object({
  email: z.string().email("Invalid email").max(255).transform((s) => s.toLowerCase().trim()),
});

export const verifyOtpBody = z.object({
  email: z.string().email("Invalid email").max(255).transform((s) => s.toLowerCase().trim()),
  otp: otpSchema,
});

export type SendOtpBody = z.infer<typeof sendOtpBody>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBody>;
