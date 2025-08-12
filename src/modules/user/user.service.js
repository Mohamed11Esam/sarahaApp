import { verifyToken } from "../../utils/token/index.js";
import { User } from "./../../DB/models/user.model.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";

// Use env variable if available, otherwise fallback to hardcoded secret
const JWT_SECRET = process.env.JWT_SECRET;

export const deleteUser = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ error: "No token provided", success: false });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByIdAndDelete(decoded.id);
    if (!user) {
      throw new Error("User not found", { cause: 404 });
    }
    return res
      .status(200)
      .json({ message: "User deleted successfully", success: true });
  } catch (error) {
    return res
      .status(error.cause || 500)
      .json({ error: error.message, success: false });
  }
};

export const uploadProfilePicture = async (req, res) => {
  try {
    const { authorization } = req.headers;
    if (!authorization) {
      return res
        .status(401)
        .json({ error: "No token provided", success: false });
    }
    const token = authorization.startsWith("Bearer ")
      ? authorization.split(" ")[1]
      : authorization;
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const userId = decodedToken.userId || decodedToken.id;
    const user = await User.findOne({ _id: userId });
    if (!user) {
      throw new Error("User not found", { cause: 404 });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No file uploaded", success: false });
    }

    // Delete old profile picture if it exists
    if (user.profilePicture) {
      const oldPath = path.resolve(user.profilePicture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save the new file path
    user.profilePicture = req.file.path;
    await user.save();

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      success: true,
      data: {
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    return res
      .status(error.cause || 500)
      .json({ error: error.message, success: false });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found", success: false });
    }
    // Reuse your OTP logic
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiration = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.otp = otp;
    user.otpExpiration = otpExpiration;
    await user.save();

    // Reuse your sendMail function
    await sendMail({
      to: email,
      subject: "Password Reset OTP",
      html: `<p>Your password reset OTP is: <strong>${otp}</strong></p>`,
    });

    // Issue a short-lived reset token
    const resetToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "10m",
    });

    return res.status(200).json({
      message: "OTP sent to email",
      success: true,
      resetToken,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, success: false });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, otp, newPassword } = req.body;
    if (!resetToken) {
      return res
        .status(400)
        .json({ error: "No reset token provided", success: false });
    }
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch (err) {
      return res
        .status(401)
        .json({ error: "Invalid or expired reset token", success: false });
    }
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found", success: false });
    }
    if (
      !user.otp ||
      user.otp !== Number(otp) ||
      !user.otpExpiration ||
      user.otpExpiration < Date.now()
    ) {
      return res
        .status(400)
        .json({ error: "Invalid or expired OTP", success: false });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiration = undefined;
    await user.save();
    return res
      .status(200)
      .json({ message: "Password reset successfully", success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message, success: false });
  }
};

// Example for your routes file

