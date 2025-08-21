import { connectDB } from "./DB/connection.js";
import { userRouter, authRouter, messageRouter } from "./modules/index.js";
import { globalErrorHandler } from "./utils/error/index.js";
import { rateLimit } from "express-rate-limit";
import { startCronJobs } from "./utils/cron.js";
export default function bootstrap(app, express) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
  });
  app.use(limiter);
  app.use(express.json());
  app.use("/user", userRouter);
  app.use("/message", messageRouter);
  app.use("/auth", authRouter);

  //global error handler
  app.use(globalErrorHandler);
  // start cron jobs after DB connection
  connectDB();
  startCronJobs();
}
