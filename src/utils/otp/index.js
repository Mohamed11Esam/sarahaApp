/** Generates a one-time password (OTP) and its expiration time.
 * @param {number} expireTime - The expiration time in minutes (default is 5 minutes).
 * @returns {Object} An object containing the OTP and its expiration time.
 */
export const generateOtp = (expireTime = 5) => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  const otpExpiration = Date.now() + expireTime * 60 * 1000; 
  return { otp, otpExpiration };
};
