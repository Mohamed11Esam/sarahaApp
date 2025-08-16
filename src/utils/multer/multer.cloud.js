import multer, { diskStorage } from "multer";
import { nanoid } from "nanoid";
import fs from "fs";
export function fileUploadCloud(allowedTypes = ["image/jpeg", "image/png", "image/gif"]) {
    const storage = diskStorage({

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