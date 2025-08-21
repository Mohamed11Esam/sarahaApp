import { verifyToken } from "../../utils/token/index.js";
import { User } from "./../../DB/models/user.model.js";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import bcrypt from "bcrypt";
import cloudinary from "./../../utils/cloud/cloudnairy.config.js";
import {
  buildImageUrl,
  SIZE_TRANSFORMS,
} from "./../../utils/cloud/cloud-utils.js";
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
    if (req.user.profilePicture.public_id) {
      await cloudinary.api.delete_resources_by_prefix(
        `profile_pictures/${req.user.id}`
      );
      await cloudinary.api.delete_folder(
        `user_profile_pictures/${req.user.id}`
      );
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
        sizes: {
          original: user.profilePicture,
        },
      },
    });
  } catch (error) {
    return res
      .status(error.cause || 500)
      .json({ error: error.message, success: false });
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

    // Ensure old profile pictures in this user's folder are removed so we replace them
    try {
      await cloudinary.api.delete_resources_by_prefix(
        `profile_pictures/${user._id}`
      );
    } catch (err) {
      // Non-fatal: log and continue
      console.error(
        "Failed to delete previous profile pictures by prefix:",
        err
      );
    }

    // Use a deterministic public_id so uploads replace previous images in the same folder
    const basePublicId = `profile_${user._id}`;
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `profile_pictures/${user._id}`,
      public_id: basePublicId,
      overwrite: true,
    });

    // Determine requested size
    const requestedSize = (
      req.query.size ||
      req.body.size ||
      "original"
    ).toString();
    const allowedSizes = Object.keys(SIZE_TRANSFORMS);
    if (!allowedSizes.includes(requestedSize)) {
      return res.status(400).json({
        error: `Invalid size requested. Allowed: ${allowedSizes.join(", ")}`,
        success: false,
      });
    }

    // Prepare sizes object to store on user.profilePicture
    const sizes = {
      original: {
        secure_url: result.secure_url,
        public_id: result.public_id,
      },
    };

    let urlForSize = result.secure_url;

    // If client requested a non-original size, create a derived/stored resource in Cloudinary
    if (requestedSize !== "original") {
      const transform = SIZE_TRANSFORMS[requestedSize];
      try {
        // derived public id based on deterministic basePublicId
        const derivedPublicId = `${basePublicId}`;
        const derived = await cloudinary.uploader.upload(result.secure_url, {
          folder: `profile_pictures/${user._id}`,
          public_id: derivedPublicId,
          transformation: transform,
          overwrite: true,
        });
        sizes[requestedSize] = {
          secure_url: derived.secure_url,
          public_id: derived.public_id,
        };
        urlForSize = derived.secure_url;
      } catch (e) {
        // fallback to building a runtime URL if storing a derived resource fails
        console.error("Failed to create derived image in Cloudinary:", e);
        urlForSize = buildImageUrl(
          result.public_id || result.secure_url,
          requestedSize
        );
      }
    }

    // Persist profile picture info including sizes
    await User.findByIdAndUpdate(user._id, {
      profilePicture: {
        secure_url: result.secure_url,
        public_id: result.public_id,
        sizes,
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
        selected: {
          size: requestedSize,
          url: urlForSize,
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
  return res
    .status(200)
    .json({ message: "Logged out successfully", success: true });
};
