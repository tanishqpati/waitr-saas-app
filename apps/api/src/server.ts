import "dotenv/config";
import app from "./app";
import { config } from "./config/env";
import { logger } from "./lib/logger";

const server = app.listen(config.port, () => {
  logger.info("Server running", { port: config.port });
});

export default server;
