import { Router } from "express";
import * as userService from "./user.service.js";
import { fileUpload } from "../../utils/multer/index.js";
import { fileValidationMiddleware } from "../../middleware/file-validation.middleware.js";
import { isAuthenticated } from "../../middleware/auth.middleware.js";
const router = Router();

router.delete("/delete-user", userService.deleteUser);
router.post(
  "/upload-profile-picture",
  isAuthenticated,
  fileUpload().single("profilePicture"),
  fileValidationMiddleware(),
  userService.uploadProfilePicture
);
router.post("/request-password-reset", userService.requestPasswordReset);
router.post("/reset-password", userService.resetPassword);

export default router;