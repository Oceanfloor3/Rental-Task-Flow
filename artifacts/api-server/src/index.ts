import http from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { seedAdmin, seedProperties } from "./seed";
import { setupWsServer } from "./lib/ws-server";
import { startScheduler } from "./lib/scheduler";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = http.createServer(app);
setupWsServer(server);

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  seedAdmin().catch((e) => logger.error({ err: e }, "Seed failed"));
  seedProperties().catch((e) => logger.error({ err: e }, "Property seed failed"));
  startScheduler();
});
