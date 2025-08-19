import { Router } from "express";
import * as userService from "./user.service.js";
import { isValid } from "../../middleware/validation.middleware.js";
import { fileUpload } from "../../utils/multer/index.js";
import { fileUploadCloud } from "../../utils/multer/multer.cloud.js";
import { fileValidationMiddleware } from "../../middleware/file-validation.middleware.js";
import { isAuthenticated } from "../../middleware/auth.middleware.js";
const router = Router();

router.delete(
  "/delete-user",
  isAuthenticated,
  userService.deleteUser
);
router.post(
  "/upload-profile-picture",
  isAuthenticated,
  fileUpload().single("profilePicture"),
  fileValidationMiddleware(),
  userService.uploadProfilePicture
);
router.post(
  "/upload-profile-picture-cloud",
  isAuthenticated,
  fileUploadCloud().single("profilePicture"),
  fileValidationMiddleware(),
  userService.uploadProfilePictureCloud
);

// Example: Add validation for password reset endpoints (if implemented)
// router.post("/request-password-reset", isValid(requestPasswordResetSchema), userService.requestPasswordReset);
// router.post("/reset-password", isValid(resetPasswordSchema), userService.resetPassword);

router.post(
  "/log-out",
  isAuthenticated,
  userService.logOut
);

export default router;
