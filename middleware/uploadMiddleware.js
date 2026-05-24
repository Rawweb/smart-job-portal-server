import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // These are the two MIME types we accept
  // We also accept the older Word format just in case
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword', // older .doc format — some browsers send this for .docx
  ];

  if (allowedTypes.includes(file.mimetype)) {
    // null as first arg means no error
    // true as second arg means accept the file
    cb(null, true);
  } else {
    cb(new Error(`File type not supported: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB in bytes
  },
});

export default upload;
