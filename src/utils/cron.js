import cron from "node-cron";
import { TokenBlacklist } from "../DB/models/token.model.js";

export function startCronJobs() {
  // Runs every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      // Delete tokens created more than 1 hour ago (matches expires setting)
      const cutoff = new Date(now.getTime() - 60 * 60 * 1000);
      const result = await TokenBlacklist.deleteMany({
        createdAt: { $lt: cutoff },
      });
      if (result.deletedCount && result.deletedCount > 0) {
        console.log(`Cron: Deleted ${result.deletedCount} expired tokens.`);
      }
    } catch (err) {
      console.error("Cron: Error deleting expired tokens:", err);
    }
  });
}
