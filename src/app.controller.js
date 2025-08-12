import { connectDB } from "./DB/connection.js";
import { userRouter, authRouter, messageRouter } from "./modules/index.js";
export default function bootstrap(app, express) {
  app.use(express.json());
  app.use("/user", userRouter);
  app.use("/message", messageRouter);
  app.use("/auth", authRouter);

  //global error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res
        .status(err.cause || 500)
        .json({ error: err.message, success: false });
  });
  connectDB();
}
