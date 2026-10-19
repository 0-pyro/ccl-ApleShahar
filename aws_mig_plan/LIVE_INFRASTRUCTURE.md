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

### For Arlen (EC2 Compute & Container):
1. In the AWS Console, launch an Ubuntu 24.04 `t2.micro` or `t3.micro` instance:
   - VPC: `vpc-0004b4f628adae8df`
   - Subnet: `subnet-01b625a9a0f0af953` (`apleshahar-public-1a`)
   - Auto-assign Public IP: Enable
   - Security Group: `sg-062252861b7de2668` (`apleshahar-ec2-sg`)
   - IAM Instance Profile: `ApleShahar-EC2-BackendRole`
2. Connect to the instance and execute:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose git
   git clone https://github.com/0-pyro/ccl-ApleShahar.git
   cd ccl-ApleShahar/backend
   # Create .env with the values from Section 2 of this document
   nano .env
   docker compose up -d --build
   ```
3. Verify backend status:
   `curl http://localhost:5000/health`

### For Hansy (Lambda Serverless Image Resizer):
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
