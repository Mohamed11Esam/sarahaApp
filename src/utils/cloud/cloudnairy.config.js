import {v2 as cloudinary} from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
export async function uploadFile(path,options) {
    return await cloudinary.uploader.upload(path, options);
}
export async function uploadFiles(files, options) {
    let uploadedAttachments = [];
    for (const file of files) {
      const { secure_url, public_id } = await uploadFile({ path: file.path, options });
      uploadedAttachments.push({ secure_url, public_id });
    }
    return uploadedAttachments;
}

export default cloudinary;
