# ApleShahar Cloud Migration: Comprehensive Engineering Report

This document records the complete engineering process for migrating the **ApleShahar** application from a split-repository, third-party backend-as-a-service (Supabase) architecture to a self-managed, cloud-native AWS infrastructure that complies with academic and production cloud computing requirements.

---

## 1. Project Background & Original State

### What is ApleShahar?
ApleShahar ("Our City") is a civic grievance redressal and municipal facility management platform tailored for municipal corporations (specifically Vasai-Virar City Municipal Corporation / VVCMC and the Mumbai Metropolitan Region). It empowers citizens to report civic issues (potholes, garbage, water leaks, broken streetlights) with photographic evidence and geolocation, tracks issue progress, and allows citizens to verify resolution before permanently closing complaints.

### The Starting Point
The project originally existed as two disconnected repositories:
- `ApleShahar` (React + Vite + Tailwind CSS frontend)
- `ApleShaharBackend` (Node.js + Express backend)

The backend was tightly coupled to Supabase:
- **Authentication**: Used Supabase Auth (`supabase.auth.signUp`, `supabase.auth.signInWithPassword`).
- **Database**: Used Supabase PostgreSQL via the `@supabase/supabase-js` query client (`supabaseAdmin.from(...)`).
- **Storage**: Used Supabase Storage buckets for citizen complaint photos.

---

## 2. Why We Made These Changes (Objectives & Constraints)

### Academic & Faculty Requirements
The migration was guided by a strict set of cloud computing conditions:
1. **Mandatory Non-Serverless Compute**: Core application must run on containerized compute or EC2 (not 100% serverless).
2. **Custom VPC**: Isolated network with public and private subnets, Internet Gateway, and tiered Security Groups.
3. **Managed Relational Database**: Amazon RDS PostgreSQL placed securely in private subnets.
4. **Cloud Storage**: Amazon S3 for genuine application assets (photos, documents).
5. **IAM Least Privilege**: Zero hardcoded credentials in source code or `.env`; temporary credentials injected via IAM Instance Profiles.
6. **Secrets & Monitoring**: CloudWatch metrics/alarms for CPU/memory, and AWS Budgets for cost control.
7. **Additional Cloud Capabilities**: Integration of supporting serverless (AWS Lambda for image processing), decoupled messaging (Amazon SNS for notifications), and Infrastructure as Code (IaC).

### Operational & Team Constraints
1. **Free Tier Protection ($0/month budget)**:
   - A single AWS account must run all services within Free Tier limits.
   - High-cost resources (NAT Gateways, Multi-AZ RDS replication) had to be strictly avoided.
2. **Team Collaboration**:
   - The team consists of three members. The account owner must not share root credentials.
   - The backend had to be modified so teammates could deploy to EC2 without editing application source code.
3. **Repository Cleanliness**:
   - Consolidating into a clean monorepo eliminated Git submodule synchronization issues and provided a single submission artifact.

---

## 3. What We Changed and Why

### A. Repository Consolidation (Monorepo)
- **What**: Cloned both original repositories, stripped internal `.git` directories, and created a unified monorepo at `https://github.com/0-pyro/ccl-ApleShahar.git`.
- **Why**: Avoided the friction of managing two separate repositories and complex Git submodules. Teammates can clone a single repository on EC2 and have access to the backend, Docker configuration, migration plans, and scripts.

### B. Decoupling from Supabase (12-Factor App Architecture)
We replaced all proprietary Supabase vendor dependencies with standard open-source and AWS-native modules:

1. **Database Layer (`backend/config/db.js`)**:
   - **What**: Replaced `@supabase/supabase-js` with standard PostgreSQL connection pooling using `pg`.
   - **Why**: Allows direct connection to Amazon RDS PostgreSQL.
   - **Auto-Initialization**: Added an automated schema initialization routine (`initDb()`) that executes `CREATE TABLE IF NOT EXISTS` for `users`, `complaints`, and `facility_requests` on startup. Teammates do not need to run manual SQL migrations on RDS.

2. **Authentication Layer (`backend/services/authService.js` & `backend/middleware/authMiddleware.js`)**:
   - **What**: Replaced Supabase Auth with self-hosted `bcryptjs` password hashing and `jsonwebtoken` (JWT).
   - **Why**: Eliminates reliance on external authentication services and keeps auth fully self-contained on EC2 at $0 cost.
   - **Compatibility**: Preserved the exact `{ session: { access_token }, user }` response format expected by the React frontend, requiring zero frontend code modifications.

3. **Storage Layer (`backend/services/uploadService.js`)**:
   - **What**: Replaced Supabase Storage with AWS SDK v3 (`@aws-sdk/client-s3`).
   - **Why**: Citizen and resolution photos are uploaded directly to the private Amazon S3 bucket (`apleshahar-media-76343`).
   - **IAM Integration**: The S3 client initializes without hardcoded access keys. When executed on EC2, it automatically resolves temporary credentials from the attached IAM Instance Profile via IMDSv2.
   - **Offline Fallback**: Includes a local filesystem storage fallback if S3 environment variables are absent during local testing.

4. **Messaging Layer (`backend/services/notificationService.js`)**:
   - **What**: Integrated Amazon SNS (`@aws-sdk/client-sns`).
   - **Why**: Dispatches automated email notifications to ward officers when a new complaint is filed and to citizens when an issue is marked resolved.

5. **Containerization (`backend/Dockerfile` & `backend/docker-compose.yml`)**:
   - **What**: Created production-grade Docker and Docker Compose files.
   - **Why**: Ensures identical runtime environments between local machines and the AWS EC2 instance.

---

## 4. How We Provisioned the Cloud Infrastructure

Instead of manual, error-prone clicking in the AWS Management Console, we implemented **Infrastructure as Code (IaC)** using the AWS CLI.

### Automation Scripts Created
- [`aws_mig_plan/deploy-infra.ps1`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/deploy-infra.ps1) (PowerShell automation for Windows)
- [`aws_mig_plan/deploy-infra.sh`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/deploy-infra.sh) (Bash automation for Linux/macOS/CloudShell)
- [`aws_mig_plan/cleanup.ps1`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/cleanup.ps1) (Automated resource teardown)
- [`aws_mig_plan/create-iam-users.ps1`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/create-iam-users.ps1) (Automated team credential generation)

---

## 5. Incident & Debugging Log (Root Causes and Resolutions)

During initial script execution, two infrastructure errors occurred:

### Incident 1: PowerShell UTF-8 Byte Order Mark (BOM) Malformed JSON
- **What Failed**: S3 bucket policy, CORS configuration, and IAM role creation failed with:
  `MalformedPolicy: Policies must be valid JSON and the first byte must be '{'`
  `ParamValidation: Expected: '=', received: 'ï' for input: ï»¿{`
- **Why It Failed**: Windows PowerShell 5.1 default UTF-8 encoding prepends a 3-byte Byte Order Mark (`0xEF 0xBB 0xBF`, rendered as `ï»¿`) to text files. The AWS CLI expects raw JSON starting with `{` at byte 0.
- **How It Was Resolved**:
  1. Rewrote the temporary policy file generation in [`deploy-infra.ps1`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/deploy-infra.ps1) to use `[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::ASCII)`. This completely eliminated the BOM.
  2. Applied the clean policies to S3 and IAM via CLI.

### Incident 2: Deprecated PostgreSQL Engine Version
- **What Failed**: Amazon RDS instance creation failed with:
  `InvalidParameterCombination: Cannot find version 16.3 for postgres`
- **Why It Failed**: In region `ap-south-1`, PostgreSQL 16 minor versions start at `16.9` through `16.15`. Version `16.3` was deprecated and unavailable for new instances.
- **How It Was Resolved**: Updated the database configuration parameter to version `"16.10"`. The database was accepted and provisioned.

---

## 6. Live Infrastructure Summary

The following resources are actively provisioned in AWS region `ap-south-1`:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        VPC: vpc-0004b4f628adae8df                     │
│                        CIDR: 10.0.0.0/16                               │
│                                                                        │
│   Public Subnet: subnet-01b625a9a0f0af953 (10.0.1.0/24)                │
│   ├── Internet Gateway: igw-0048ad4830f3abf26                          │
│   ├── Security Group: sg-062252861b7de2668 (Ports 80, 443, 22, 5000)   │
│   └── Amazon EC2: i-0260cf2d7f71c8832 (3.110.87.195:5000) - LIVE       │
│                                                                        │
│   Private Subnets:                                                     │
│   ├── subnet-0b7a37def7a9389ae (10.0.2.0/24 - ap-south-1a)           │
│   └── subnet-0acda9b4e81e2203f (10.0.3.0/24 - ap-south-1b)           │
│       └── Amazon RDS PostgreSQL (db.t3.micro, Single-AZ)              │
│           Endpoint: apleshahar-postgres.claiyoqcgr10...rds.amazonaws   │
│           Security Group: sg-0b9bde57f8c29bfdc (Port 5432 from EC2 SG)│
└────────────────────────────────────────────────────────────────────────┘

Supporting Cloud Services:
├── Amazon S3 Bucket: apleshahar-media-76343 (Public read, CORS enabled)
├── IAM Role & Profile: ApleShahar-EC2-BackendRole (Least-privilege S3/SNS/SSM)
├── Amazon SNS Topic: apleshahar-complaint-alerts
└── CloudWatch Alarm: EC2-HighCPU-Alarm (CPU > 75%)
```

---

## 7. Handover and Remaining Steps

### Completed:
- Monorepo consolidated and pushed to GitHub.
- Backend decoupled from Supabase to native PostgreSQL, JWT, S3, and SNS.
- Core networking, database, security, and messaging infrastructure provisioned in AWS.
- EC2 Compute & Container deployed by Arlen (`i-0260cf2d7f71c8832` at `3.110.87.195:5000`).
- Healthcheck, database auto-migration, user registration, and authentication verified live.
- Live infrastructure details documented in [`aws_mig_plan/LIVE_INFRASTRUCTURE.md`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/LIVE_INFRASTRUCTURE.md).

### Remaining Tasks in Migration Plan:
1. **Hansy (Serverless & Observability - Capability 1)**: Package and deploy the Lambda thumbnail resizer from `aws_mig_plan/lambda/`, attach the S3 trigger on `apleshahar-media-76343`, and test thumbnail generation.
2. **Arlen (Frontend Cloud Hosting / CDN - Capability 3)**: Deploy the static frontend bundle (`frontend/dist/`) to S3 with Amazon CloudFront CDN (or host via Nginx on EC2 port 80).
3. **End-to-End Verification**: Register, login, file grievance with photo, verify S3 upload, Lambda thumbnailing, and SNS email.
4. **Teardown**: After evaluation, execute `.\aws_mig_plan\cleanup.ps1` to stop and delete resources.
