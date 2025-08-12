
import { verifyToken } from '../utils/token/index.js';
import { User } from './../DB/models/user.model.js';

export const isAuthenticated = async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        throw new Error("No token provided");
        
    }
    const payload = verifyToken(token);
    const userExist = await User.findById(payload.userId)
    if (!userExist) {

        throw new Error("user not found" , {cause : 404})
    }
    req.user = userExist
    return next();
}