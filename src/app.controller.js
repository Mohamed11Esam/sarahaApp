import { connectDB } from "./DB/connection.js";
import { userRouter, authRouter, messageRouter } from "./modules/index.js";
import { globalErrorHandler } from "./utils/error/index.js";
export default function bootstrap(app, express) {
  app.use(express.json());
  app.use("/user", userRouter);
  app.use("/message", messageRouter);
  app.use("/auth", authRouter);

  //global error handler
  app.use(globalErrorHandler);
  connectDB();
}
