import multer, { diskStorage } from "multer";
import { nanoid } from "nanoid";
import fs from "fs";
export function fileUpload(allowedTypes = ["image/jpeg", "image/png", "image/gif"]) {
    const storage = diskStorage({
        destination: (req, file, cb) => {
            let dest = `uploads/${req.user.id}`;
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }
            cb(null, dest);
        },
        filename: (req, file, cb) => {
            cb(null, nanoid(5) + "-" + file.originalname);
        },
    });

    const fileFilter = (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type"), false);
        }
    };

    return multer({ storage, fileFilter });
}