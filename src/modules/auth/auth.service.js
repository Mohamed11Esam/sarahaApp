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
