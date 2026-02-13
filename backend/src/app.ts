import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { generalLimiter, authLimiter } from "./middleware/rateLimit";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);

app.use("/api", routes);

app.use(
  (
    err: Error & { statusCode?: number },
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error(err);
    const statusCode = err.statusCode || 500;
    res
      .status(statusCode)
      .json({ message: err.message || "Internal server error" });
  },
);

export default app;
