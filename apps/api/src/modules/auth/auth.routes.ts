import { Router } from "express";
import { sendOtp, verifyOtp } from "./auth.service";

export const authRouter = Router();

authRouter.post("/send-otp", async (req, res, next) => {
  try {
    const email = req.body?.email;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    await sendOtp(email);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/verify-otp", async (req, res, next) => {
  try {
    const email = req.body?.email;
    const otp = req.body?.otp;
    if (!email || typeof email !== "string" || !otp || typeof otp !== "string") {
      res.status(400).json({ error: "Email and OTP are required" });
      return;
    }
    const { token } = await verifyOtp(email, otp);
    res.json({ token });
  } catch (e) {
    next(e);
  }
});
