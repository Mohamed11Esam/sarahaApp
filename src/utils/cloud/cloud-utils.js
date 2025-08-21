import cloudinary from "./cloudnairy.config.js";

// Map friendly size names to Cloudinary transformation strings
export const SIZE_TRANSFORMS = {
  thumb: { width: 150, height: 150, crop: "thumb" },
  small: { width: 320, height: 240, crop: "scale" },
  medium: { width: 640, height: 480, crop: "scale" },
  large: { width: 1024, height: 768, crop: "scale" },
  original: null,
};

export function buildImageUrl(publicIdOrUrl, size = "original") {
  // If value is already a full URL, use Cloudinary to build a transformed URL if size != original
  if (!publicIdOrUrl) return null;
  const transform = SIZE_TRANSFORMS[size] || SIZE_TRANSFORMS["original"];
  // If original or not a cloudinary public_id (contains https://), return original
  if (!transform) return publicIdOrUrl;
  // If given a secure_url, extract public_id part if possible
  if (publicIdOrUrl.startsWith("http")) {
    // cloudinary.url can accept the full URL but safer to return original
    try {
      const url = cloudinary.url(publicIdOrUrl, {
        width: transform.width,
        height: transform.height,
        crop: transform.crop,
        folder: `profile_pictures/${user._id}`,
      });
      return url;
    } catch (e) {
      return publicIdOrUrl;
    }
  }
  return cloudinary.url(publicIdOrUrl, {
    width: transform.width,
    height: transform.height,
    crop: transform.crop,
  });
}
