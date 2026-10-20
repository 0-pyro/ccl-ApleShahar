# ApleShahar Live AWS Infrastructure Documentation

This document records the active AWS cloud infrastructure provisioned for the **ApleShahar** project in region `ap-south-1` (Mumbai). All resources below are live, verified, and mapped to the project requirements.

---

## 1. Live Resource Inventory

| Resource Type | Resource Name / Tag | AWS ID / Value | Configuration Details |
| :--- | :--- | :--- | :--- |
| **AWS Region** | Mumbai | `ap-south-1` | Primary deployment region for all services. |
| **VPC** | `apleshahar-vpc` | `vpc-0004b4f628adae8df` | CIDR: `10.0.0.0/16`, DNS Hostnames enabled. |
| **Internet Gateway** | `apleshahar-igw` | `igw-0048ad4830f3abf26` | Attached to `vpc-0004b4f628adae8df`. |
| **Public Subnet (EC2)** | `apleshahar-public-1a` | `subnet-01b625a9a0f0af953` | CIDR: `10.0.1.0/24`, AZ: `ap-south-1a`, Auto-assign public IP: Yes. |
| **Private Subnet 1 (RDS)**| `apleshahar-private-1a`| `subnet-0b7a37def7a9389ae` | CIDR: `10.0.2.0/24`, AZ: `ap-south-1a`. |
| **Private Subnet 2 (RDS)**| `apleshahar-private-1b`| `subnet-0acda9b4e81e2203f` | CIDR: `10.0.3.0/24`, AZ: `ap-south-1b`. |
| **Route Table (Public)** | `apleshahar-public-rt` | Associated with Public Subnet | Route `0.0.0.0/0` -> `igw-0048ad4830f3abf26`. |
| **EC2 Security Group** | `apleshahar-ec2-sg` | `sg-062252861b7de2668` | Inbound: Ports 80 (HTTP), 443 (HTTPS), 22 (SSH). |
| **RDS Security Group** | `apleshahar-rds-sg` | `sg-0b9bde57f8c29bfdc` | Inbound: Port 5432 (PostgreSQL) restricted to `sg-062252861b7de2668`. |
| **RDS Subnet Group** | `apleshahar-db-subnets`| Multi-AZ Subnet Group | Encompasses private subnets in `ap-south-1a` and `ap-south-1b`. |
| **RDS PostgreSQL DB** | `apleshahar-postgres` | `apleshahar-postgres.claiyoqcgr10.ap-south-1.rds.amazonaws.com` | Engine: PostgreSQL 16.10, Class: `db.t3.micro`, Storage: 20GB gp3, Single-AZ, Port: 5432. |
| **Database Name** | `apleshahar` | Master user: `postgres` | Password: Set during deployment (`ApleShaharPassword123!`). |
| **S3 Media Storage** | `apleshahar-media-76343`| `s3://apleshahar-media-76343` | Public read bucket policy applied; browser CORS policy active. |
| **EC2 Instance (Backend)** | `apleshahar-backend-server` | `i-0260cf2d7f71c8832` | Public IP: `3.110.87.195`, Type: `t3.micro`, Port 5000, State: `running`. |
| **IAM Role** | `ApleShahar-EC2-BackendRole` | `arn:aws:iam::852227600998:role/ApleShahar-EC2-BackendRole` | Trust: EC2. Policies: S3 scoped read/write, SNS publish, SSM Session Manager. |
| **IAM Instance Profile** | `ApleShahar-EC2-BackendRole` | Attached to Role | Used when launching the backend EC2 instance. |
| **SNS Topic** | `apleshahar-complaint-alerts` | `arn:aws:sns:ap-south-1:852227600998:apleshahar-complaint-alerts` | Email subscription active (`apatade76@gmail.com`). |
| **CloudWatch Alarm** | `EC2-HighCPU-Alarm` | Threshold: CPU > 75% | Actions: Send notification to SNS topic upon breach. |

---

## 2. Backend EC2 Environment File (.env)

When launching the backend container on EC2, use this exact configuration in `backend/.env`:

```env
# Application Port
PORT=5000

# CORS Allowed Origins
FRONTEND_URL=*

# Database Connection (Amazon RDS PostgreSQL)
DB_HOST=apleshahar-postgres.claiyoqcgr10.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=apleshahar
DB_USER=postgres
DB_PASSWORD=ApleShaharPassword123!
DB_SSL=true

# Authentication
JWT_SECRET=super-secure-production-jwt-token-string-32-chars
JWT_EXPIRES_IN=7d
AUTHORITY_SECURITY_CODE=AUTHORITY

# AWS Integration (Credentials provided automatically by EC2 IAM Instance Profile)
AWS_REGION=ap-south-1
S3_BUCKET_NAME=apleshahar-media-76343
SNS_TOPIC_ARN=arn:aws:sns:ap-south-1:852227600998:apleshahar-complaint-alerts
```

---

## 3. Incident & Troubleshooting Log

During the initial deployment using PowerShell, two specific runtime errors occurred and were resolved:

### Incident 1: PowerShell UTF-8 Byte Order Mark (BOM) Malformed JSON
- **Symptom**: S3 bucket policy, S3 CORS, and IAM role creation failed with:
  `MalformedPolicy: Policies must be valid JSON and the first byte must be '{'`
  `ParamValidation: Expected: '=', received: 'ï' for input: ï»¿{`
- **Root Cause**: Windows PowerShell 5.1 `Set-Content -Encoding utf8` prepends a 3-byte UTF-8 Byte Order Mark (`0xEF 0xBB 0xBF`, rendered as `ï»¿`) to text files. The AWS CLI requires plain JSON starting with `{` at byte 0.
- **Resolution**: Updated temporary file generation to use `[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::ASCII)`. This guarantees pure ASCII text without BOM. All policies and CORS rules were then successfully applied.

### Incident 2: Deprecated PostgreSQL Engine Version
- **Symptom**: RDS database creation failed with:
  `InvalidParameterCombination: Cannot find version 16.3 for postgres`
- **Root Cause**: In region `ap-south-1`, AWS PostgreSQL 16 minor versions start at `16.9` through `16.15`. Version `16.3` was no longer available for new instances.
- **Resolution**: Updated the automation script parameter to version `16.10`. The database launched successfully.

---

## 4. Next Steps for Team Members

### Completed: Arlen (EC2 Compute & Backend Container) - VERIFIED
- **Instance ID**: `i-0260cf2d7f71c8832`
- **Public IP**: `3.110.87.195`
- **Instance Type**: `t3.micro` (Ubuntu 24.04 LTS)
- **Status**: Running live with Docker container `apleshahar-backend`.
- **Healthcheck**: Verified at `http://3.110.87.195:5000/health`.
- **Database Link**: Successfully connected to Amazon RDS PostgreSQL (`apleshahar-postgres`). Auto-created tables (`users`, `complaints`, `facility_requests`).
- **Live Test**: Successfully registered citizen user (`id: 1` and `id: 2`) and verified JWT authentication.

### Pending: Arlen (Frontend Hosting & CloudFront CDN - Capability 3):
Choose either Method A (Recommended: S3 + CloudFront CDN) or Method B (Nginx on existing EC2):

#### Method A: S3 Static Hosting + CloudFront CDN (Recommended for project rubric)
1. Build production bundle on your machine:
   - In `frontend/.env`, ensure:
     `VITE_API_BASE_URL=http://3.110.87.195:5000`
   - Run:
     `npm install`
     `npm run build`
     (This outputs the static files into `frontend/dist/`)
2. Create S3 Bucket for Frontend:
   - Bucket name: `apleshahar-frontend-76343` (Region: `ap-south-1`)
   - Uncheck "Block all public access"
   - Under Properties -> Static website hosting -> Enable:
     - Index document: `index.html`
     - Error document: `index.html`
   - Under Permissions -> Bucket policy:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Sid": "PublicReadGetObject",
           "Effect": "Allow",
           "Principal": "*",
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::apleshahar-frontend-76343/*"
         }
       ]
     }
     ```
3. Upload files:
   - Upload all files from `frontend/dist/` into the root of `apleshahar-frontend-76343`.
4. Create CloudFront Distribution (Capability 3 CDN):
   - Origin domain: Select `apleshahar-frontend-76343.s3-website.ap-south-1.amazonaws.com` (use the website endpoint from S3 Properties)
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Default root object: `index.html`
   - Error pages tab -> Create custom error response:
     - HTTP error code: `403` and `404`
     - Response page path: `/index.html`
     - HTTP response code: `200: OK`
5. Note the CloudFront distribution domain name (e.g. `https://d111111abcdef8.cloudfront.net`).

#### Method B: Nginx on existing EC2 (Alternative)
1. Connect to EC2 instance `i-0260cf2d7f71c8832` via SSH.
2. Install Nginx:
   `sudo apt install -y nginx`
3. Clone or pull repo:
   `cd ~/ccl-ApleShahar/frontend`
   `npm install && npm run build`
4. Copy build:
   `sudo cp -r dist/* /var/www/html/`
5. Configure Nginx SPA fallback in `/etc/nginx/sites-available/default`:
   Set `try_files $uri $uri/ /index.html;` inside `location /`.
6. Restart Nginx:
   `sudo systemctl restart nginx`
7. Access frontend at `http://3.110.87.195`.

### Pending: Hansy (Lambda Serverless Image Resizer - Capability 1):
1. In directory `aws_mig_plan/lambda/`, run:
   `npm install`
   Create a zip file containing `index.mjs`, `package.json`, and `node_modules`.
2. In AWS Lambda console, create function `ApleShahar-ImageResizer` (Node.js 20.x, x86_64).
3. Upload the zip file.
4. Add S3 Trigger:
   - Bucket: `apleshahar-media-76343`
   - Event: `s3:ObjectCreated:*`
5. Test by uploading an image into S3; verify that Lambda creates a corresponding `thumb-*` file.

---

## 5. Post-Presentation Resource Teardown

To avoid unnecessary credit consumption after faculty review, execute [`aws_mig_plan/cleanup.ps1`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/cleanup.ps1):

```powershell
cd aws_mig_plan
.\cleanup.ps1 -Region "ap-south-1"
```
This will cleanly delete the RDS database, S3 bucket, CloudWatch alarm, SNS topic, security groups, subnets, and VPC.
