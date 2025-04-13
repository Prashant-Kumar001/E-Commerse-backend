import multer from 'multer';
import path from 'path';

const uploadDir = "src/uploads/";


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname); 
        cb(null, `${uniqueSuffix}${ext}`); 
    }
});


export const singleUpload = multer({ storage: storage }).single('image');
export const multipleUpload = multer({ storage: storage }).array('images', 10);
