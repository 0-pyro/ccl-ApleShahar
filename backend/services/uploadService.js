import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;

// On EC2, credentials are automatically resolved via IAM Instance Profile (IMDSv2)
const s3Client = new S3Client({ region: REGION });

/**
 * Uploads an image either to AWS S3 (Production) or local storage (Fallback).
 *
 * @param {Buffer} fileBuffer - Image buffer from Multer
 * @param {string} mimetype - Content type (e.g. 'image/jpeg')
 * @param {string} folder - Folder prefix (e.g. 'complaints', 'resolved', 'facility')
 * @returns {Promise<string>} Public URL of the uploaded image
 */
export async function uploadImage(fileBuffer, mimetype, folder = 'uploads') {
  const extension = mimetype?.split('/')[1] || 'jpg';
  const filename = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;

  // If S3 bucket is configured, upload to AWS S3
  if (BUCKET_NAME) {
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: fileBuffer,
        ContentType: mimetype || 'image/jpeg',
      }));

      // Use CloudFront CDN domain if available for low-latency delivery
      if (CLOUDFRONT_DOMAIN) {
        return `https://${CLOUDFRONT_DOMAIN}/${filename}`;
      }

      return `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${filename}`;
    } catch (err) {
      console.error('AWS S3 Upload Error:', err.message);
      throw new Error(`Failed to upload media to AWS S3: ${err.message}`);
    }
  }

  // Local filesystem fallback (for offline local development before S3 is created)
  const localDir = path.resolve('uploads', folder);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  const localFilePath = path.join(localDir, `${Date.now()}.${extension}`);
  fs.writeFileSync(localFilePath, fileBuffer);

  const port = process.env.PORT || 5000;
  return `http://localhost:${port}/uploads/${folder}/${path.basename(localFilePath)}`;
}

// Backward compatibility alias for existing controller calls
export const uploadImageToSupabase = uploadImage;