
import { TokenBlacklist } from '../DB/models/token.model.js';
import { verifyToken } from '../utils/token/index.js';
import { User } from './../DB/models/user.model.js';

export const isAuthenticated = async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        throw new Error("No token provided");
        
    }
    const payload = verifyToken(token);
    const blacklistedToken = await TokenBlacklist.findOne({ token, type: 'access' });
    if (blacklistedToken) {
        throw new Error("Token is blacklisted", { cause: 401 });
    }
    const userExist = await User.findById(payload.userId)
    if (!userExist) {

        throw new Error("user not found" , {cause : 404})
    }
    req.user = userExist
    return next();
}