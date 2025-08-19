import { model, Schema } from "mongoose";



const schema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: function () { 
    if (this.attachments && this.attachments.length > 0) {
      return false; 
    } 
    return true; 
  }},
  attachments: [{ secure_url: String, public_id:String }],
  timestamp: { type: Date, default: Date.now },
});

export const Message = model("Message", schema);