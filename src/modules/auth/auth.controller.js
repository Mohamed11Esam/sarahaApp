import { Router } from "express";
import asyncHandler from "../../utils/error/index.js";
import * as authService from "./auth.service.js";
import { isValid } from "../../middleware/validation.middleware.js";
import { loginSchema, registerSchema, requestPasswordResetSchema, resetPasswordSchema } from "./auth.validation.js";

const router = Router();

router.post("/register", isValid(registerSchema), asyncHandler(authService.register));
router.post("/login", isValid(loginSchema), asyncHandler(authService.login));
router.post("/verify-otp", asyncHandler(authService.verifyOtp));
router.post("/resend-otp", asyncHandler(authService.reSendOtp));
router.post("/google-login", asyncHandler(authService.googleLogin));
router.post("/request-password-reset", isValid(requestPasswordResetSchema), asyncHandler(authService.requestPasswordReset));
router.post("/reset-password", isValid(resetPasswordSchema), asyncHandler(authService.resetPassword));

export default router;
