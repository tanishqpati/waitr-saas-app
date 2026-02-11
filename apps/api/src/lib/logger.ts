const prefix = "[waitr-api]";

export const logger = {
  info(msg: string, data?: Record<string, unknown>) {
    console.log(prefix, msg, data ?? "");
  },
  error(msg: string, err?: unknown) {
    console.error(prefix, msg, err ?? "");
  },
  auth(event: string, data?: Record<string, unknown>) {
    console.log(prefix, "auth", event, data ?? "");
  },
  order(event: string, data?: Record<string, unknown>) {
    console.log(prefix, "order", event, data ?? "");
  },
};
