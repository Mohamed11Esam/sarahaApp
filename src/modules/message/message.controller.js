import { Router } from "express";
import { fileUpload } from "../../utils/multer/index.js";
import { isValid } from "../../middleware/validation.middleware.js";
import { sendMessageSchema } from "./message.validation.js";
import { sendmessage } from "./message.service.js";

const router = Router();
router.post("/:receiver",fileUpload().array("attachments"), isValid(sendMessageSchema), sendmessage);
export default router;
