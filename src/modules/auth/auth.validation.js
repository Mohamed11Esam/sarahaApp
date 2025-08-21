import joi from "joi";

export const registerSchema = joi
  .object({
    firstName: joi.string().min(2).max(100).required(),
    lastName: joi.string().min(2).max(100).required(),
    email: joi.string().email(),
    password: joi.string().min(6).required(),
    phone: joi.string().min(10).max(15),
    dob: joi.date().less("now"),
  })
  .or("email", "phone")
  .required();

export const loginSchema = joi
  .object({
    email: joi.string().email(),
    password: joi.string().min(6).required(),
    phone: joi.string().min(10).max(15),
  })
  .or("email", "phone");

export const requestPasswordResetSchema = joi
  .object({
    email: joi.string().email().required(),
  })
  .required();

export const resetPasswordSchema = joi
  .object({
    resetToken: joi.string().required(),
    otp: joi.number().required(),
    newPassword: joi.string().min(6).required(),
  })
  .required();

export const verifyOtpSchema = joi
  .object({
    email: joi.string().email().required(),
    otp: joi.number().required(),
  })
  .required();

export const resendOtpSchema = joi
  .object({
    email: joi.string().email().required(),
  })
  .required();

export const googleLoginSchema = joi
  .object({
    idToken: joi.string().required(),
  })
  .required();
