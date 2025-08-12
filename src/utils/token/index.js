import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
export const verifyToken = (token) => {
  // Logic to verify the token
  console.log(process.env.JWT_SECRET);

  return jwt.verify(token, process.env.JWT_SECRET);
};
