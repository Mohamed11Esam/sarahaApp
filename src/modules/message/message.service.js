import { Message } from "../../DB/models/message.model.js";
import cloudinary, { uploadFiles } from "../../utils/cloud/cloudnairy.config.js";


export const sendmessage = async (req, res) => {
  try {
    const { receiver } = req.params;
    const { content } = req.body;
    const { attachments } = req.files;

    const uploadedAttachments = await uploadFiles(attachments, { folder: `messages/${req.user._id}/${receiver}` });
    const message = await Message.create({
      receiver,
      content,
      attachments : uploadedAttachments,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

