
import { mongoose,Schema , model} from 'mongoose';
const TokenBlacklistSchema = new Schema({
  token: { type: String},
  type: { type: String, enum: ['access', 'refresh'], default: 'access' },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, expires: '1h' },
});

export const TokenBlacklist = mongoose.model('TokenBlacklist', TokenBlacklistSchema);