import pino from "pino";
import { config } from "../config/env";

const isDev = config.nodeEnv !== "production";

const base = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: { service: "waitr-api" },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
      }
    : {}),
});

const logger = {
  info(msg: string, data?: Record<string, unknown>) {
    if (data != null) base.info(data, msg);
    else base.info(msg);
  },
  debug(msg: string, data?: Record<string, unknown>) {
    if (data != null) base.debug(data, msg);
    else base.debug(msg);
  },
  error(msg: string, err?: unknown) {
    const payload: Record<string, unknown> = {};
    if (err instanceof Error) {
      payload.error = err.message;
      payload.stack = err.stack;
    } else if (err != null) {
      payload.error = err;
    }
    base.error(payload, msg);
  },
  auth(event: string, data?: Record<string, unknown>) {
    const payload = { type: "auth" as const, event, ...data };
    base.info(payload, `auth: ${event}`);
  },
  order(event: string, data?: Record<string, unknown>) {
    const payload = { type: "order" as const, event, ...data };
    base.info(payload, `order: ${event}`);
  },
};

export { logger };
