import { Router } from "express";
import { validate } from "../../middleware/validate";
import { sendOtpBody, verifyOtpBody } from "../../validators/auth";
import { sendOtp, verifyOtp } from "./auth.service";

export const authRouter = Router();

authRouter.post("/send-otp", validate(sendOtpBody), async (req, res, next) => {
  try {
    const { email } = req.body;
    await sendOtp(email);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/verify-otp", validate(verifyOtpBody), async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const { token } = await verifyOtp(email, otp);
    res.json({ token });
  } catch (e) {
    next(e);
  }
});
