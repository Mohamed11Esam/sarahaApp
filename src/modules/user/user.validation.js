import Joi from "joi";

const sizeEnum = Joi.string().valid(
  "thumb",
  "small",
  "medium",
  "large",
  "original"
);

export const deleteUserSchema = Joi.object({});

export const uploadProfilePictureSchema = Joi.object({
  // when uploading locally we may allow an optional size request
  size: sizeEnum.optional(),
});

export const uploadProfilePictureCloudSchema = Joi.object({
  size: sizeEnum.optional(),
});

export const logOutSchema = Joi.object({});

export const requestPasswordResetSchema = Joi.object({
  email: Joi.string().email().required(),
});
