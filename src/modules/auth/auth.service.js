import { sendMail } from "../../utils/email/index.js";
import { generateOtp } from "../../utils/otp/index.js";
import { User } from "./../../DB/models/user.model.js";
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
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
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiration = Date.now() + 5 * 60 * 1000; // 5 minutes from now
  user.otp = otp;
  user.otpExpiration = otpExpiration;
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
  const token = jwt.sign({ userId: userExists._id }, JWT_SECRET, {
    expiresIn: "1h",
  });
  return res.status(200).json({
    message: "Login successful",
    success: true,
    data: { userExists, token },
  });
};

// Verify OTP
export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    otp,
    otpExpiration: { $gt: Date.now() },
  });
  if (!user) {
    return res
      .status(401)
      .json({ error: "Invalid or expired OTP", success: false });
  }
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiration = undefined;
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
  const { otp, otpExpiration } = generateOtp();
  user.otp = otp;
  user.otpExpiration = otpExpiration;
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
