# AWS Lambda Thumbnail Generator (Capability 1)

This Lambda function satisfies the **Supporting Serverless** requirement by asynchronously compressing and creating thumbnails of citizen complaint images uploaded to S3.

---

## 🚀 Quick Deployment Guide

### Option A: Via AWS Console (Easiest)
1. In the AWS Console, go to **AWS Lambda** ➔ **Create function**:
   - Function name: `ApleShahar-ImageResizer`
   - Runtime: **Node.js 20.x**
   - Architecture: **x86_64**
2. In **Configuration** ➔ **Permissions**:
   - Ensure the execution role has policies for `s3:GetObject` and `s3:PutObject` on your bucket `arn:aws:s3:::apleshahar-media-storage/*`.
3. In **Configuration** ➔ **General Configuration**:
   - Set **Memory** to `512 MB` and **Timeout** to `10 seconds`.
4. In **Add Trigger**:
   - Select **S3**.
   - Bucket: `apleshahar-media-storage`.
   - Event types: `All object create events` (`s3:ObjectCreated:*`).
5. Upload Code:
   - Run `npm install` inside this folder.
   - Zip `index.mjs`, `package.json`, and `node_modules`.
   - Upload the zip file in the Lambda Code tab.
