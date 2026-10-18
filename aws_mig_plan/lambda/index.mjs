/**
 * AWS Lambda Function: ApleShahar Image Resizer & Thumbnail Generator
 * 
 * Trigger: Amazon S3 (s3:ObjectCreated:*) on bucket "apleshahar-media-storage"
 * Runtime: Node.js 20.x
 */
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3 = new S3Client();

export const handler = async (event) => {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Prevent recursive loop: skip images that are already resized or thumbnails
    if (key.includes('thumb-') || key.includes('-resized')) {
      console.log(`Skipping already-processed file: ${key}`);
      continue;
    }

    try {
      // 1. Fetch original image from S3
      const getObjectResponse = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }));
      const inputBuffer = Buffer.from(await getObjectResponse.Body.transformToByteArray());

      // 2. Compress & resize with sharp (max width 800px, 80% JPEG quality)
      const outputBuffer = await sharp(inputBuffer)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      // 3. Save optimized thumbnail back into S3
      const thumbnailKey = key.replace(/(.*)\/([^/]+)$/, '$1/thumb-$2');
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: outputBuffer,
        ContentType: 'image/jpeg',
      }));

      console.log(`✅ Successfully generated thumbnail: ${thumbnailKey}`);
    } catch (err) {
      console.error(`❌ Error processing image ${key}:`, err);
      throw err;
    }
  }

  return { statusCode: 200, body: 'Thumbnail generation complete' };
};
