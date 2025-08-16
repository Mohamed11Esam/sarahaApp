import { verifyToken } from "../../utils/token/index.js";
import { User } from "./../../DB/models/user.model.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import cloudinary from "./../../utils/cloud/cloudnairy.config.js";
import { TokenBlacklist } from "../../DB/models/token.model.js";

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
    if(req.user.profilePicture.public_id) {
      await cloudinary.api.delete_resources_by_prefix(`profile_pictures/${req.user.id}`);
      await cloudinary.api.delete_folder(`user_profile_pictures/${req.user.id}`);
    }
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

export const uploadProfilePictureCloud = async (req, res) => {
  try {
    const user = req.user;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ error: "No file uploaded", success: false });
    }

    // If user has an old profile picture, delete it from Cloudinary
    if (user.profilePicture && user.profilePicture.public_id) {
      try {
        await cloudinary.uploader.destroy(user.profilePicture.public_id);
      } catch (err) {
        // Log but don't block the upload if deletion fails
        console.error(
          "Failed to delete old profile picture from Cloudinary:",
          err
        );
      }
    }

    // Upload to a user-specific folder in Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `profile_pictures/${user._id}`,
    });

    // Update user profile with the new image info (including public_id for future deletion)
    await User.findByIdAndUpdate(user._id, {
      profilePicture: {
        secure_url: result.secure_url,
        public_id: result.public_id,
      },
    });

    return res.status(200).json({
      message: "Profile picture uploaded successfully",
      success: true,
      data: {
        profilePicture: {
          secure_url: result.secure_url,
          public_id: result.public_id,
        },
      },
    });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", success: false });
  }
};

export const logOut = async (req, res) => {
  const token = req.headers.authorization;
  await TokenBlacklist.create({ token, user: req.user._id });
  return res.status(200).json({ message: "Logged out successfully", success: true });
};
