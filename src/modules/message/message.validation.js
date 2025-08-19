import joy from "joi";

export const sendMessageSchema = joy.object({
  receiver: joy.string().required(),
  content: joy.string().allow("").optional(),
  attachments: joy.array().items(
    joy.object({
      secure_url: joy.string().uri().required(),
      public_id: joy.string().required(),
    })
  ),
}).required();
