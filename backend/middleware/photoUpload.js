const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WebP or GIF images are allowed.'));
  },
}).single('photo');

// Runs before the controller. If a photo was sent, it is converted to WebP,
// saved in backend/uploads, and its URL is placed in req.body.photoUrl.
const handlePhotoUpload = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Photo must be 5 MB or smaller.'
        : err.message;
      return res.status(400).json({ success: false, message });
    }
    if (!req.file) return next(); // no file sent: continue as normal

    try {
      const fileName = `${crypto.randomBytes(16).toString('hex')}.webp`;
      await sharp(req.file.buffer)
        .rotate() // fixes sideways phone photos
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(UPLOAD_DIR, fileName));

      req.body.photoUrl = `/uploads/${fileName}`;
      next();
    } catch (e) {
      res.status(400).json({ success: false, message: 'That file is not a valid image.' });
    }
  });
};

module.exports = { handlePhotoUpload };
