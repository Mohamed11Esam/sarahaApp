import { sendMail } from "../../utils/email/index.js";
import { generateOtp } from "../../utils/otp/index.js";
import { User } from "./../../DB/models/user.model.js";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { generateToken } from "../../utils/token/index.js";
import { TokenBlacklist } from "../../DB/models/token.model.js";
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// Register
export const register = async (req, res) => {
  const { firstName, lastName, email, password, phone, dob } = req.body;

  const userExists = await User.findOne({
    $or: [
      {
        $and: [
          { email: { $ne: null } },
          { email: { $exists: true } },
          { email: email },
        ],
      },
      {
        $and: [
          { phone: { $ne: null } },
          { phone: { $exists: true } },
          { phone: phone },
        ],
      },
    ],
  });
  if (userExists) {
    return res
      .status(409)
      .json({ error: "User already exists", success: false });
  }

  const user = new User({
    firstName,
    lastName,
    email,
    password: await bcrypt.hash(password, 10),
    phone,
    dob,
  });
  // Verification code logic
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiration = Date.now() + 2 * 60 * 1000; // 2 minutes from now
  user.otp = otp;
  user.otpExpiration = otpExpiration;
  user.otpFailedAttempts = 0;
  user.otpBanUntil = undefined;
  if (email) {
    await sendMail({
      to: email,
      subject: "Verification Email",
      html: `<p>Your verification code is: <strong>${otp}</strong></p>`,
    });
  }
  await user.save();
  return res
    .status(201)
    .json({ message: "User registered successfully", success: true });
};

// Login
export const login = async (req, res) => {
  const { email, phone, password } = req.body;
  const userExists = await User.findOne({
    $or: [
      {
        $and: [
          { email: { $ne: null } },
          { email: { $exists: true } },
          { email: email },
        ],
      },
      {
        $and: [
          { phone: { $ne: null } },
          { phone: { $exists: true } },
          { phone: phone },
        ],
      },
    ],
  });
  if (!userExists) {
    return res.status(404).json({ error: "User not found", success: false });
  }
  const isMatch = await bcrypt.compare(password, userExists.password);
  if (!isMatch) {
    return res
      .status(401)
      .json({ error: "Invalid credentials", success: false });
  }
  const accessToken = generateToken(userExists._id, "1h");
  const refreshToken = generateToken(userExists._id, "7d");
  await TokenBlacklist.create({
    token: refreshToken,
    user: userExists._id,
    type: "refresh",
  });
  return res.status(200).json({
    message: "Login successful",
    success: true,
    data: { userExists, accessToken, refreshToken },
  });
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: "User not found", success: false });
  }
  // Check for ban
  if (user.otpBanUntil && user.otpBanUntil > Date.now()) {
    return res
      .status(429)
      .json({
        error: `Too many failed attempts. Try again after ${Math.ceil(
          (user.otpBanUntil - Date.now()) / 1000
        )} seconds.`,
        success: false,
      });
  }
  // Check OTP expiration
  if (!user.otp || user.otpExpiration < Date.now()) {
    return res.status(401).json({ error: "OTP expired", success: false });
  }
  // Check OTP value
  if (user.otp !== Number(otp)) {
    user.otpFailedAttempts = (user.otpFailedAttempts || 0) + 1;
    // Ban after 5 failed attempts
    if (user.otpFailedAttempts >= 5) {
      user.otpBanUntil = Date.now() + 5 * 60 * 1000; // 5 minutes ban
      await user.save();
      return res
        .status(429)
        .json({
          error: "Too many failed attempts. You are banned for 5 minutes.",
          success: false,
        });
    }
    await user.save();
    return res
      .status(401)
      .json({
        error: `Invalid OTP. Attempts left: ${5 - user.otpFailedAttempts}`,
        success: false,
      });
  }
  // Success: reset attempts and ban
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiration = undefined;
  user.otpFailedAttempts = 0;
  user.otpBanUntil = undefined;
  await user.save();
  return res
    .status(200)
    .json({ message: "OTP verified successfully", success: true });
};

// Resend OTP
export const reSendOtp = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: "User not found", success: false });
  }
  // If banned, do not allow resend
  if (user.otpBanUntil && user.otpBanUntil > Date.now()) {
    return res
      .status(429)
      .json({
        error: `You are temporarily banned from requesting a new code. Try again after ${Math.ceil(
          (user.otpBanUntil - Date.now()) / 1000
        )} seconds.`,
        success: false,
      });
  }
  // Reset failed attempts if ban expired
  if (user.otpBanUntil && user.otpBanUntil <= Date.now()) {
    user.otpFailedAttempts = 0;
    user.otpBanUntil = undefined;
  }
  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiration = Date.now() + 2 * 60 * 1000; // 2 minutes
  user.otp = otp;
  user.otpExpiration = otpExpiration;
  user.otpFailedAttempts = 0;
  await sendMail({
    to: email,
    subject: "Resend Verification Email",
    html: `<p>Your new verification code is: <strong>${otp}</strong></p>`,
  });
  await user.save();
  return res
    .status(200)
    .json({ message: "OTP resent successfully", success: true });
};

// Google Login
export const googleLogin = async (req, res) => {
  const { idToken } = req.body;
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const { email, fullName, phone, dob, isVerified } = ticket.getPayload();
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      email,
      fullName,
      phone,
      dob,
      isVerified: true,
      userAgent: "google",
    });
    await user.save();
  }
  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });
  return res.status(200).json({
    message: "Google login successful",
    success: true,
    data: { user, token },
  });
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
    user.credentialsUpdatedAt = Date.now();
    
    await user.save();
    await TokenBlacklist.deleteMany({user: user._id , type: 'refresh'});
    return res
      .status(200)
      .json({ message: "Password reset successfully", success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message, success: false });
  }
};