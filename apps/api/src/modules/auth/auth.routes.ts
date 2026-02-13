import { Router, type Request, type Response, type NextFunction } from "express";
import { config } from "../../config/env";
import { validate } from "../../middleware/validate";
import { sendOtpBody, verifyOtpBody } from "../../validators/auth";
import { logout, refreshTokens, sendOtp, verifyOtp } from "./auth.service";

export const authRouter = Router();

const refreshCookieOptions = {
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: "lax" as const,
  maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
  path: "/",
};

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(config.refreshCookieName, refreshToken, refreshCookieOptions);
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(config.refreshCookieName, { path: "/" });
}

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
    const { accessToken, refreshToken } = await verifyOtp(email, otp);
    setRefreshCookie(res, refreshToken);
    res.json({ token: accessToken });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.[config.refreshCookieName];
    if (!refreshToken) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }
    const { accessToken, refreshToken: newRefreshToken } = await refreshTokens(refreshToken);
    setRefreshCookie(res, newRefreshToken);
    res.json({ token: accessToken });
  } catch (e) {
    clearRefreshCookie(res);
    next(e);
  }
});

authRouter.post("/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.[config.refreshCookieName];
    await logout(refreshToken);
    clearRefreshCookie(res);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
