import { Message } from "../../DB/models/message.model.js";
import cloudinary, {
  uploadFiles,
} from "../../utils/cloud/cloudnairy.config.js";
import { buildImageUrl } from "../../utils/cloud/cloud-utils.js";

export const sendmessage = async (req, res) => {
  try {
    const { receiver } = req.params;
    const { content } = req.body;
    const { attachments } = req.files;

    const uploadedAttachments = await uploadFiles(attachments, {
      folder: `messages/${req.user._id}/${receiver}`,
    });
    // Normalize attachments by ensuring each has a url and optionally a sizedUrl helper
    const normalized = uploadedAttachments.map((att) => ({
      ...att,
      sizedUrl: (size = "original") =>
        buildImageUrl(att.public_id || att.secure_url, size),
    }));
    const message = await Message.create({
      receiver,
      content,
      attachments: normalized,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
