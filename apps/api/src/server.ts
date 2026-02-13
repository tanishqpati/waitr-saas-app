import "dotenv/config";
import http from "node:http";
import app from "./app";
import { config } from "./config/env";
import { logger } from "./lib/logger";
import { initSocket } from "./lib/socket";

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(config.port, () => {
  logger.info("Server running", { port: config.port });
});

export default httpServer;
