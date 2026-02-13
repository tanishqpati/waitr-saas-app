import { z } from "zod";

export const sendOtpBody = z.object({
  email: z.string().email("Invalid email").transform((s) => s.toLowerCase().trim()),
});

export const verifyOtpBody = z.object({
  email: z.string().email("Invalid email").transform((s) => s.toLowerCase().trim()),
  otp: z.string().min(1, "OTP is required"),
});

export type SendOtpBody = z.infer<typeof sendOtpBody>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBody>;
