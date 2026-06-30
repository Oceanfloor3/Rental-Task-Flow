import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { mkdirSync } from "fs";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

export const UPLOADS_DIR = path.resolve(process.cwd(), "chat-uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const PgSession = connectPgSimple(session);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({
  limit: "20mb",
  verify: (req: any, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

app.use("/api/uploads", express.static(UPLOADS_DIR));
app.use("/api", router);

// Global error handler — always returns JSON so the frontend never sees HTML
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const status = (err as any)?.status ?? (err as any)?.statusCode ?? 500;
  const message = (err as any)?.message ?? "Internal server error";
  logger.error({ err }, "Unhandled error");
  res.status(status).json({ error: message });
});

export default app;
