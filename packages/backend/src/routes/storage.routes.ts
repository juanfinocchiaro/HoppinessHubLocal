import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(__dirname, '../../data/uploads');

const ALLOWED_BUCKETS = [
  'product-images',
  'regulations',
  'staff-documents',
  'inspection-photos',
  'warning-signatures',
  'cv-uploads',
  'proveedores-docs',
] as const;

type Bucket = (typeof ALLOWED_BUCKETS)[number];

function isBucket(value: string): value is Bucket {
  return (ALLOWED_BUCKETS as readonly string[]).includes(value);
}

function ensureDir(dir: string): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function sanitizePath(p: string): string {
  return p.replace(/\.\./g, '').replace(/^\/+/, '');
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const bucket = req.params.bucket;
    if (!isBucket(bucket)) {
      return cb(new AppError(400, `Invalid bucket: ${bucket}`), '');
    }

    let dir = path.join(UPLOADS_ROOT, bucket);
    const requestedPath = req.query.path as string | undefined;
    if (requestedPath) {
      const safe = sanitizePath(requestedPath);
      const subdir = path.dirname(safe);
      if (subdir && subdir !== '.') {
        dir = path.join(dir, subdir);
      }
    }

    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const requestedPath = req.query.path as string | undefined;
    if (requestedPath) {
      const safe = sanitizePath(requestedPath);
      cb(null, path.basename(safe));
    } else {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    }
  },
});

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

const router = Router();

// POST /upload/:bucket — upload file to bucket
router.post('/upload/:bucket', requireAuth, (req, res, next) => {
  if (!isBucket(req.params.bucket)) {
    return next(new AppError(400, `Invalid bucket: ${req.params.bucket}`));
  }

  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return next(new AppError(400, err.message));
      }
      return next(err);
    }

    if (!req.file) {
      return next(new AppError(400, 'No file uploaded'));
    }

    const requestedPath = req.query.path as string | undefined;
    const fileUrl = requestedPath
      ? `/uploads/${req.params.bucket}/${sanitizePath(requestedPath)}`
      : `/uploads/${req.params.bucket}/${req.file.filename}`;

    res.status(201).json({
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  });
});

// GET /signed-url/:bucket/:filename — return the file URL (local equivalent)
router.get('/signed-url/:bucket/:filename', requireAuth, (req, res, next) => {
  try {
    const { bucket, filename } = req.params;
    if (!isBucket(bucket)) {
      throw new AppError(400, `Invalid bucket: ${bucket}`);
    }

    const filePath = path.join(UPLOADS_ROOT, bucket, filename);
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, 'File not found');
    }

    res.json({ data: { url: `/uploads/${bucket}/${filename}` } });
  } catch (err) {
    next(err);
  }
});

// DELETE /:bucket/:filename — delete file
router.delete('/:bucket/:filename', requireAuth, (req, res, next) => {
  try {
    const { bucket, filename } = req.params;
    if (!isBucket(bucket)) {
      throw new AppError(400, `Invalid bucket: ${bucket}`);
    }

    const filePath = path.join(UPLOADS_ROOT, bucket, filename);
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, 'File not found');
    }

    fs.unlinkSync(filePath);
    res.json({ data: { message: 'File deleted' } });
  } catch (err) {
    next(err);
  }
});

export { router as storageRoutes };
