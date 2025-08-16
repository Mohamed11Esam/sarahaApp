import jwt from "jsonwebtoken";
import { TokenBlacklist } from "../../DB/models/token.model.js";
import { generateToken } from "../token/index.js";

const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch((error) => {
      next(error);
    });
  };
};
export default asyncHandler;

export const globalErrorHandler = async (err, req, res, next) => {
  if (err.message === "jwt expired") {
    try {
      const refreshToken =
        req.headers.refreshtoken || req.headers["refresh-token"];
      if (!refreshToken) {
        return res
          .status(401)
          .json({ error: "No refresh token provided", success: false });
      }
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      } catch (verifyErr) {
        return res
          .status(401)
          .json({ error: "Invalid refresh token", success: false });
      }
      await TokenBlacklist.findOneAndDelete({
        token: refreshToken,
        user: decoded.userId,
        type: "refresh",
      });
      const newAccessToken = generateToken(decoded.userId, "1h");
      const newRefreshToken = generateToken(decoded.userId, "7d");
      await TokenBlacklist.create({
        token: newRefreshToken,
        user: decoded.userId,
        type: "refresh",
      });
      return res.status(200).json({
        message: "Tokens refreshed successfully",
        data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
      });
    } catch (refreshErr) {
      return res
        .status(500)
        .json({ error: refreshErr.message, success: false });
    }
  }
  console.error(err.stack);
  res.status(err.cause || 500).json({ error: err.message, success: false });
};
