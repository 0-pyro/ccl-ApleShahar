# ApleShahar AWS Cloud Deployment Guide

This guide provides comprehensive instructions for deploying the ApleShahar cloud infrastructure. It covers:
1. Architecture Mapping: How each component fulfills the original migration plan (aws_mig_plan/image.png).
2. Path A: Automated Deployment: Using our infrastructure automation scripts (aws_mig_plan/deploy-infra.ps1 and aws_mig_plan/deploy-infra.sh).
3. Path B: Manual Deployment: Step-by-step click guide in the AWS Management Console.
4. The EC2 and Application Step: Connecting to EC2 and launching the containerized backend.
5. The Lambda Serverless Step: Packaging and deploying the thumbnail generator.
6. Verification and Testing: Verifying all resources, health checks, and end-to-end flows.
7. Post-Evaluation Cleanup: Safely stopping or deleting resources to preserve Free Tier credits.

---

## 1. Architecture Mapping to Original Plan (image.png)

| Cloud Area / Requirement | AWS Service in Plan | Functional Role in ApleShahar | Implementation Method |
| :--- | :--- | :--- | :--- |
| Compute (Mandatory Non-Serverless) | Amazon EC2 (t2.micro / t3.micro) | Hosts containerized Node.js/Express backend API behind Nginx. | EC2 Launch Wizard / CLI (Section 4) |
| Networking (Mandatory VPC) | Custom AWS VPC (10.0.0.0/16) | Network isolation with 1 Public Subnet, 2 Private Subnets, IGW, Route Tables, and Tiered SGs. | Automated Script (Step 1-2) or Console |
| Database (Mandatory Managed DB) | Amazon RDS PostgreSQL (db.t3.micro) | Relational database for users, complaints, and facility requests; isolated in private subnets. | Automated Script (Step 6) or Console |
| Storage (Mandatory S3) | Amazon S3 (apleshahar-media-storage) | Bucket for citizen complaint photos, authority resolution proofs, and reports. | Automated Script (Step 3) or Console |
| Security & Access Control | AWS IAM (Roles & Instance Profile) | Least-privilege IAM role attached to EC2 for S3 & SNS without credentials in code. | Automated Script (Step 4) or Console |
| Secrets Management | AWS SSM Parameter Store / .env | Stores encrypted DB credentials, JWT secret keys, and authority security code. | Parameter Store / EC2 .env |
| Monitoring & Logging | Amazon CloudWatch (Alarm & Logs) | Collects logs and triggers alarm if backend EC2 CPU exceeds 75%. | Automated Script (Step 7) or Console |
| Cost Management | AWS Budgets | Automated budget alert sending email notifications if forecasted spend exceeds $0.80 USD. | AWS Console (Section 2) |
| Supporting Serverless (Capability 1) | AWS Lambda (Node.js 20.x) | Asynchronously generates compressed thumbnails when photos are uploaded to S3. | Code in aws_mig_plan/lambda/ |
| Decoupled Messaging (Capability 2) | Amazon SNS | Dispatches email alerts to ward officers on new issues and citizens on resolution. | Automated Script (Step 5) or Console |
| Content Delivery (Capability 3) | Amazon CloudFront | Edge CDN caching static frontend and S3 complaint images with low latency. | CloudFront Console (Optional) |

---

## 2. Prerequisites & Free Tier Rules

Before running commands, configure the AWS CLI on your machine:
```bash
aws configure
# Region: ap-south-1 (Mumbai)
# Output: json
```

### Free Tier Rules to Avoid Accidental Charges:
- Never create a NAT Gateway: NAT Gateways cost approximately $32/month with no free tier. Our architecture places EC2 in the public subnet to talk to RDS directly inside the VPC.
- Always select Single-AZ for RDS: Multi-AZ is a paid enterprise feature.
- Only run 1 EC2 instance 24/7: The Free Tier gives 750 instance hours/month. Two instances running simultaneously will consume 1500 hours and incur charges.
- Keep all resources in ap-south-1: Cross-region data transfer incurs extra bandwidth fees.

---

## 3. Path A: Automated Deployment via AWS CLI

We have provided ready-to-run automation scripts that provision VPC, Subnets, Routing, Security Groups, S3, IAM Roles, SNS, RDS, and CloudWatch in one execution.

### Option 1: Using Windows PowerShell
```powershell
cd aws_mig_plan

.\deploy-infra.ps1 -Region "ap-south-1" `
                   -DbPassword "ApleShaharPassword123!" `
                   -AlertEmail "your-email@gmail.com" `
                   -BucketPrefix "apleshahar-media"
```

### Option 2: Using Bash (Linux / macOS / Git Bash / AWS CloudShell)
```bash
cd aws_mig_plan
chmod +x deploy-infra.sh

./deploy-infra.sh "ap-south-1" "ApleShaharPassword123!" "your-email@gmail.com" "apleshahar-media"
```

### Script Outputs:
At completion, the script prints:
- VpcId, PublicSubnetId, Ec2SgId
- IamInstanceProfile (ApleShahar-EC2-BackendRole)
- S3BucketName
- SnsTopicArn
- Command to retrieve your RDS Endpoint.

After running the script, proceed directly to Section 4 (The EC2 Step) and Section 5 (The Lambda Step).

---

## 4. Path B: Manual Deployment via AWS Management Console

If you prefer to configure everything manually via the AWS Console UI, follow these steps:

### Step 1: AWS Budgets
1. Open AWS Budgets -> Create budget.
2. Select Cost budget -> set monthly threshold to $0.80 USD.
3. Add your team's email addresses for alert notifications.

### Step 2: Custom VPC & Networking
1. Open VPC Console -> Create VPC:
   - Select VPC and more.
   - Name tag: apleshahar-vpc
   - IPv4 CIDR: 10.0.0.0/16
   - Number of AZs: 2
   - Number of Public Subnets: 1 (10.0.1.0/24 in ap-south-1a)
   - Number of Private Subnets: 2 (10.0.2.0/24 in ap-south-1a, 10.0.3.0/24 in ap-south-1b)
   - NAT Gateways: None ($0)
   - VPC Endpoints: None
2. Click Create VPC.

### Step 3: Security Groups
1. Go to VPC -> Security Groups -> Create security group:
   - Name: apleshahar-ec2-sg | VPC: apleshahar-vpc
   - Inbound Rules:
     - HTTP (Port 80) from 0.0.0.0/0
     - HTTPS (Port 443) from 0.0.0.0/0
     - SSH (Port 22) from My IP
2. Create second security group:
   - Name: apleshahar-rds-sg | VPC: apleshahar-vpc
   - Inbound Rules:
     - PostgreSQL (Port 5432) from Source: select apleshahar-ec2-sg.

### Step 4: Amazon RDS PostgreSQL
1. Go to RDS -> Subnet groups -> Create DB Subnet Group:
   - Name: apleshahar-db-subnets | VPC: apleshahar-vpc
   - Select your two private subnets.
2. Go to Databases -> Create database:
   - Method: Standard create
   - Engine: PostgreSQL (version 15 or 16)
   - Template: Free Tier (db.t3.micro)
   - DB Identifier: apleshahar-postgres
   - Master username: postgres | Password: ApleShaharPassword123!
   - Storage: 20 GiB gp3 (Disable autoscaling)
   - Availability: Single DB instance (Do NOT choose Multi-AZ)
   - Connectivity: VPC apleshahar-vpc, Subnet group apleshahar-db-subnets, Public access: No
   - Security Group: Choose apleshahar-rds-sg
   - Initial database name (under Additional configuration): apleshahar
3. Click Create database. Copy the Endpoint once available.

### Step 5: Amazon S3 Bucket
1. Open S3 -> Create bucket:
   - Bucket name: apleshahar-media-storage-<unique-number> (Region: ap-south-1)
   - Uncheck Block all public access and acknowledge the warning.
2. Under Permissions -> Bucket policy, paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::<YOUR_BUCKET_NAME>/*"
       }
     ]
   }
   ```
3. Under Permissions -> CORS, paste:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedOrigins": ["*"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### Step 6: IAM Role for EC2
1. Open IAM -> Roles -> Create role:
   - Trusted entity: AWS service -> EC2.
2. Attach policy: AmazonSSMManagedInstanceCore.
3. Add an inline policy named ApleShaharAppPermissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject"],
         "Resource": "arn:aws:s3:::<YOUR_BUCKET_NAME>/*"
       },
       {
         "Effect": "Allow",
         "Action": "sns:Publish",
         "Resource": "*"
       }
     ]
   }
   ```
4. Name the role: ApleShahar-EC2-BackendRole.

### Step 7: Amazon SNS (Email Notifications)
1. Open SNS -> Topics -> Create topic:
   - Type: Standard | Name: apleshahar-complaint-alerts
2. Click Create subscription:
   - Protocol: Email | Endpoint: your-email@example.com
3. Check your email and click Confirm subscription. Copy the Topic ARN.

### Step 8: CloudWatch Alarm
1. Open CloudWatch -> Alarms -> Create alarm.
2. Select metric: EC2 -> CPUUtilization.
3. Condition: Greater than 75% for 5 minutes.
4. Action: Send notification to apleshahar-complaint-alerts. Name: EC2-HighCPU-Alarm.

---

## 5. The Compute / EC2 Step (Launching & Running the Backend)

Whether you used the script or the console, you now launch the EC2 instance:

### 1. Launch EC2 Instance
1. Go to EC2 Console -> Launch instance:
   - Name: apleshahar-backend-server
   - OS Image: Ubuntu Server 24.04 LTS (Free Tier eligible)
   - Instance type: t2.micro or t3.micro
   - Key pair: Select or create your personal key pair (.pem)
   - Network settings (click Edit):
     - VPC: apleshahar-vpc
     - Subnet: apleshahar-public-1a
     - Auto-assign public IP: Enable
     - Security group: Select existing apleshahar-ec2-sg
   - Advanced details (scroll to bottom):
     - IAM instance profile: Select ApleShahar-EC2-BackendRole
2. Click Launch instance.

---

### 2. Connect to EC2 and Start Backend
SSH into your EC2 instance (or use browser-based EC2 Instance Connect / SSM):

```bash
# Connect from your local terminal
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

# 1. Update and install Docker + Git
sudo apt update && sudo apt install -y docker.io docker-compose git
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
newgrp docker

# 2. Clone the repository
git clone https://github.com/0-pyro/ccl-ApleShahar.git
cd ccl-ApleShahar/backend

# 3. Configure .env file
cp .env.example .env
nano .env
```

Inside .env, fill in the values:
```env
PORT=5000
FRONTEND_URL=*

DB_HOST=<YOUR_RDS_ENDPOINT>
DB_PORT=5432
DB_NAME=apleshahar
DB_USER=postgres
DB_PASSWORD=ApleShaharPassword123!
DB_SSL=true

JWT_SECRET=super-secure-production-jwt-token-string-32-chars
S3_BUCKET_NAME=<YOUR_S3_BUCKET_NAME>
SNS_TOPIC_ARN=<YOUR_SNS_TOPIC_ARN>
AWS_REGION=ap-south-1
```

```bash
# 4. Launch the containerized backend
docker compose up -d --build

# 5. Check logs to verify schema creation
docker logs apleshahar-backend
```
You will see:
```text
Server running on port 5000
PostgreSQL Schema verified: tables (users, complaints, facility_requests) ready.
```

---

## 6. The Lambda Serverless Step (Thumbnail Generator)

1. Open your terminal in aws_mig_plan/lambda/:
   ```bash
   cd aws_mig_plan/lambda
   npm install
   # On Windows PowerShell:
   Compress-Archive -Path index.mjs, package.json, node_modules -DestinationPath lambda.zip -Force
   # On Linux/macOS:
   zip -r lambda.zip index.mjs package.json node_modules
   ```
2. In AWS Console -> AWS Lambda -> Create function:
   - Name: ApleShahar-ImageResizer
   - Runtime: Node.js 20.x (Architecture: x86_64)
3. In the Code tab, click Upload from -> .zip file -> upload lambda.zip.
4. In Configuration -> Permissions, click the execution role name and add permission for s3:GetObject and s3:PutObject on your bucket.
5. In Function Overview, click Add trigger:
   - Trigger: S3
   - Bucket: <YOUR_S3_BUCKET_NAME>
   - Event type: s3:ObjectCreated:*

---

## 7. Full Verification & Testing Checklist

Run these checks to ensure full health and capture evidence for your faculty submission:

- [ ] Backend Health Check:
  ```bash
  curl http://<EC2_PUBLIC_IP>:5000/health
  # Expected: {"status":"ok","service":"ApleShahar-Backend", ...}
  ```
- [ ] Database Verification:
  Connect to the backend logs to see schema auto-initialization:
  ```bash
  docker logs apleshahar-backend | grep "Schema verified"
  ```
- [ ] End-to-End Image & Lambda Test:
  1. Open your frontend pointing to http://<EC2_PUBLIC_IP>:5000.
  2. Register a new user and submit a complaint with a photo.
  3. Go to S3 console: verify the original image exists in complaints/.
  4. Verify that Lambda created a complaints/thumb-* thumbnail.
- [ ] SNS Alert Verification:
  Check your email inbox to verify you received the [ApleShahar Alert] New Issue in Ward notification.
- [ ] CloudWatch Alarm Verification:
  In CloudWatch Alarms, verify EC2-HighCPU-Alarm status shows OK (green).

---

## 8. Post-Evaluation Teardown (Preserving Credits)

Once you have finished presenting to your faculty, you can stop or clean up resources so they do not consume credits:

- Temporary Pause:
  - Stop the EC2 instance: EC2 -> select instance -> Instance state -> Stop instance.
  - Stop the RDS instance: RDS -> select database -> Actions -> Stop temporarily (stops for up to 7 days).
- Permanent Teardown:
  - Delete EC2 instance (Terminate).
  - Delete RDS database (without final snapshot if just a demo).
  - Empty and delete S3 bucket.
  - Delete CloudWatch Alarm, SNS Topic, and VPC.
