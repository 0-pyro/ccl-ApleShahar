# ApleShahar End-to-End Cloud Platform & Application Demonstration Guide

This document provides a unified, step-by-step demonstration procedure for the **ApleShahar** civic grievance and municipal facility management platform. It maps every component from the target architecture ([`aws_mig_plan/image.png`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/image.png) and [`aws_mig_plan/MIGRATION_PLAN.md`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/MIGRATION_PLAN.md)) to the live AWS resources, followed by an end-to-end walkthrough of the live web application and console verification.

---

## 1. Architecture Cross-Reference Matrix

This matrix maps each architectural subsystem from the target diagram directly to the live AWS cloud resources and its user-facing feature:

| Diagram Subsystem (`image.png`) | Cloud Service | AWS Resource Name / Identifier | Functional Role & Application Feature |
| :--- | :--- | :--- | :--- |
| **Edge & CDN** | Amazon CloudFront | `E173DOOWG8BGP2`<br>(`d1gbzyhd2sdjfm.cloudfront.net`) | Global edge caching for frontend static bundle, HTTPS termination, and reverse proxying `/api/*` to EC2 and `/complaints/*` to S3. |
| **Static Web Origin** | Amazon S3 | `apleshahar-frontend-852227600998-2026` | Hosts the compiled React 19 / Vite Single Page Application (SPA). |
| **Network Isolation** | Amazon VPC | `vpc-0004b4f628adae8df`<br>(`10.0.0.0/16`) | Tiered network isolation with public subnet (`10.0.1.0/24`) and private subnets (`10.0.2.0/24`, `10.0.3.0/24`). |
| **Core Compute** | Amazon EC2 | `i-0260cf2d7f71c8832`<br>(`3.110.87.195`, `t3.micro`) | Runs the containerized Node.js/Express REST API in Docker with connection pooling. |
| **Relational Database** | Amazon RDS | `apleshahar-postgres`<br>(PostgreSQL 16.10, `db.t3.micro`) | Managed database in private subnets storing user profiles, complaints, and facility requests. |
| **Media Storage** | Amazon S3 | `apleshahar-media-76343` | Stores citizen complaint photos, resolution evidence, and generated thumbnails. |
| **Serverless Processing** | AWS Lambda | `ApleShahar-ImageResizer`<br>(Node.js 20.x, 512 MB) | Event-driven image optimizer triggered on `s3:ObjectCreated:*` to compress photos by ~82%. |
| **Decoupled Messaging** | Amazon SNS | `apleshahar-complaint-alerts` | Pushes transactional email notifications to authorities upon new complaint submissions. |
| **Secrets Management** | AWS SSM | Parameter Store (`/apleshahar/*`) | Injects encrypted database credentials and JWT secrets into container runtime via IAM. |
| **Monitoring & Alarms** | Amazon CloudWatch | `EC2-HighCPU-Alarm` | Monitors EC2 CPU utilization (> 75%) and routes threshold breach alerts to SNS. |
| **Identity & Security** | AWS IAM | `ApleShahar-EC2-BackendRole` | Scoped least-privilege instance profile granting EC2 access to S3, SNS, and SSM without disk credentials. |

---

## 2. Pre-Demo Setup Checklist

Open the following tabs in your web browser before the viva to ensure a seamless demonstration:

- **Tab 1 (Live Application)**: `https://d1gbzyhd2sdjfm.cloudfront.net`
- **Tab 2 (Backend API Health)**: `https://d1gbzyhd2sdjfm.cloudfront.net/api/health`
- **Tab 3 (AWS CloudFront)**: Console -> CloudFront -> Distribution `E173DOOWG8BGP2`.
- **Tab 4 (AWS S3)**: Console -> S3 -> Bucket `apleshahar-media-76343` -> `complaints/`.
- **Tab 5 (AWS Lambda)**: Console -> Lambda -> `ApleShahar-ImageResizer` -> Monitor tab.
- **Tab 6 (Authority Notification Inbox)**: Email inbox (`apatade76@gmail.com`) for SNS alert verification.

---

## 3. Phase 1: Live Working Application Workflow Demo

**Goal**: Demonstrate citizen registration, grievance filing with photographic proof, real-time tracking, and municipal authority management.

```text
+------------------+       +-------------------+       +--------------------+       +-------------------+
|  1. Register     | ----> |  2. File Grievance| ----> |  3. Citizen Tracks | ----> |  4. Authority     |
|  Citizen Account |       |  Photo + Ward Geo |       |  Status Dashboard  |       |  Updates & Proof  |
+------------------+       +-------------------+       +--------------------+       +-------------------+
```

### Step 1: Citizen Registration & JWT Authentication
1. Open **Tab 1** (`https://d1gbzyhd2sdjfm.cloudfront.net`).
2. Point out the secure HTTPS padlock icon in the browser address bar provided by Amazon CloudFront.
3. Click **Sign Up**:
   - Name: `Demo Citizen`
   - Email: `citizen.demo@apleshahar.gov.in`
   - Contact: `9876543210`
   - Ward: `Ward 12`
   - Password: `Password123!`
4. Click **Create Account**:
   - The user is authenticated instantly.
   - Point out that the application issues a secure JSON Web Token (JWT) stored in browser session storage, preserving seamless user sessions without relying on third-party BaaS cookies.

---

### Step 2: Grievance Submission with Live Photographic Evidence
1. From the navigation header, click **Report Issue**.
2. Complete the grievance redressal form:
   - **Issue Category**: `Pothole / Road Damage`
   - **Ward**: `Ward 12`
   - **Problem Title**: `Deep Pothole Near Station Road Junction`
   - **Description**: `Pothole approximately 2 feet wide causing vehicular congestion and safety hazards during peak transit hours.`
   - **Location Coordinates**: `19.3912, 72.8397` (Auto-filled or selected on map).
   - **Photo Upload**: Select a high-resolution sample image (e.g. 500 KB to 2 MB) from your machine.
3. Click **Submit Complaint**:
   - Show the instant confirmation dialog with generated Complaint ID.
   - Explain to examiners: *The client dispatches the multipart image payload directly through CloudFront over HTTPS to the containerized Express backend. The backend persists the record into Amazon RDS PostgreSQL, streams the photo into Amazon S3, and immediately returns HTTP 201 without blocking for image resizing or email delivery.*

---

### Step 3: Citizen Dashboard & Real-Time Tracking
1. Navigate to **My Complaints**:
   - Point out the newly created grievance displaying status badge: `Pending`.
   - Show the rendered image proof loaded securely from the CloudFront CDN edge (`/complaints/*`).
   - Show ward metrics, submission date, and unique grievance tracking reference.

---

### Step 4: Ward Authority Workflow & Resolution
1. Click **Log Out** from the user profile menu.
2. Log in using the municipal authority account (or register with Role `authority` using security code `AUTHORITY`):
   - Email: `officer.ward12@apleshahar.gov.in`
   - Password: `Password123!`
3. Navigate to **Manage Complaints**:
   - Show the grievance submitted by the citizen in Step 2 appearing in the officer's administrative queue.
   - Click **Update Status**:
     - Change status from `Pending` to `In Progress`.
     - Set Estimated Resolution Time: `24 Hours`.
     - Add Official Note: `Municipal road repair crew dispatched with cold-mix asphalt patch.`
   - Click **Save Changes**.
4. Show the updated timeline reflecting live in the database without page reloads.

---

## 4. Phase 2: AWS Management Console Showcase (Tracing `image.png`)

Now transition to the AWS Management Console to prove every architectural claim from [`aws_mig_plan/image.png`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/image.png).

---

### Verification 1: Unified Edge Delivery & Content Delivery (Amazon CloudFront)
1. Navigate to **CloudFront** -> **Distributions** -> `E173DOOWG8BGP2`:
   - Point out Status: **Enabled** with domain `d1gbzyhd2sdjfm.cloudfront.net`.
2. Click **Origins** tab:
   - Show all three origins unified under a single distribution:
     1. `S3-Website-Origin`: S3 static hosting bucket (`apleshahar-frontend-852227600998-2026`).
     2. `EC2-Backend-Origin`: Amazon EC2 server (`ec2-3-110-87-195.ap-south-1.compute.amazonaws.com:5000`).
     3. `S3-Media-Origin`: S3 complaint media bucket (`apleshahar-media-76343`).
3. Click **Behaviors** tab:
   - Default (`*`) -> S3 frontend bundle.
   - `/api/*` -> EC2 backend (dynamic pass-through, `TTL=0`, all HTTP methods, headers forwarded).
   - `/complaints/*` -> S3 media bucket with edge caching enabled.
4. Click **Error pages** tab: Show HTTP 403 and 404 custom error responses mapped to `/index.html` with status `200: OK` for client-side React Router navigation.

---

### Verification 2: Network Isolation & Tiered Subnets (Amazon VPC)
1. Navigate to **VPC** -> **Your VPCs**:
   - Click `apleshahar-vpc` (`vpc-0004b4f628adae8df`, CIDR `10.0.0.0/16`).
   - Show attached Internet Gateway: `apleshahar-igw`.
2. Click **Subnets**:
   - Public Subnet: `apleshahar-public-1a` (`10.0.1.0/24`) with auto-assign public IPv4 enabled (hosts EC2).
   - Private Subnets: `apleshahar-private-1a` (`10.0.2.0/24`) and `apleshahar-private-1b` (`10.0.3.0/24`) spanning two Availability Zones (`ap-south-1a`, `ap-south-1b`).
3. Click **Route Tables**:
   - Public Route Table: Show route `0.0.0.0/0` targeted to Internet Gateway.
   - Private Route Table: Show strictly local routing (`10.0.0.0/16`) with no internet gateway route.
4. Click **Security Groups**:
   - `apleshahar-ec2-sg`: Inbound ports 80, 443, 22, and 5000.
   - `apleshahar-rds-sg`: Inbound port 5432 allowed **only** from source `sg-062252861b7de2668` (`apleshahar-ec2-sg`).

---

### Verification 3: Core Containerized Compute (Amazon EC2)
1. Navigate to **EC2** -> **Instances**:
   - Click `apleshahar-backend-server` (`i-0260cf2d7f71c8832`, `t3.micro`, Ubuntu 24.04).
   - Point out Public IPv4: `3.110.87.195`.
   - Point out attached IAM Instance Profile: `ApleShahar-EC2-BackendRole`.
2. Open **Tab 2** (`https://d1gbzyhd2sdjfm.cloudfront.net/api/health`):
   - Show JSON response confirming healthy container state:
     ```json
     {"status":"ok","service":"ApleShahar-Backend","timestamp":"..."}
     ```

---

### Verification 4: Zero Secrets on Disk (AWS Systems Manager Parameter Store)
1. Navigate to **Systems Manager** -> **Parameter Store**:
   - Filter by path prefix `/apleshahar/`.
   - Show all 11 stored parameters:
     - `/apleshahar/db_password` (Type: `SecureString`, encrypted with AWS KMS).
     - `/apleshahar/jwt_secret` (Type: `SecureString`, encrypted with AWS KMS).
     - `/apleshahar/db_host`, `/apleshahar/db_name`, `/apleshahar/db_user`, etc.
2. Explain to examiners: *The EC2 instance does not keep plaintext database credentials on disk. At startup, the Node.js application fetches parameters from SSM Parameter Store into process memory using its IAM instance profile credentials.*

---

### Verification 5: Managed Relational Database (Amazon RDS PostgreSQL)
1. Navigate to **RDS** -> **Databases**:
   - Click `apleshahar-postgres` (PostgreSQL 16.10, `db.t3.micro`, 20 GB gp3).
   - Connectivity tab: Highlight **Publicly Accessible = No**.
   - Show DB Subnet Group: `apleshahar-db-subnets` spanning private subnets across two AZs.
2. Explain to examiners: *The database auto-initialized schemas (`users`, `complaints`, `facility_requests`) and performance indexes (`idx_complaints_ward`, `idx_complaints_status`, `idx_users_email`). Decoupled migrations can be executed independently via `npm run db:migrate`.*

---

### Verification 6: Serverless Image Optimization Pipeline (AWS Lambda & S3)
1. Open **Tab 4** (S3 Bucket `apleshahar-media-76343` / `complaints/`):
   - Click **Refresh**.
   - Show the newly uploaded original complaint photo from Phase 1.
   - Point to the auto-generated thumbnail file: `thumb-<filename>`.
   - Show the size comparison: Original (~600 KB) vs. Thumbnail (~100 KB), proving ~82% payload compression.
2. Open **Tab 5** (Lambda `ApleShahar-ImageResizer`):
   - Show runtime: `Node.js 20.x`, Memory: `512 MB`.
   - Function overview: Show active S3 trigger on `apleshahar-media-76343` (`s3:ObjectCreated:*`).
   - Click **View CloudWatch logs**: Open the latest log stream and show the execution event (<800 ms duration).

---

### Verification 7: Decoupled Messaging & Notifications (Amazon SNS)
1. Navigate to **Simple Notification Service (SNS)** -> **Topics**:
   - Click `apleshahar-complaint-alerts`.
   - Show confirmed email subscription: `apatade76@gmail.com`.
2. Open **Tab 6** (Email Inbox):
   - Show the transactional email notification received during Phase 1:
     - **Sender**: `AWS Notifications <no-reply@sns.amazonaws.com>`
     - **Subject**: `[ApleShahar Alert] New Issue in Ward 12`
     - **Body**: Shows complaint title, ward, and timestamp.
   - Highlight: The Express API published the event to SNS asynchronously without waiting on email transmission.

---

### Verification 8: Observability & Security (CloudWatch & IAM)
1. Navigate to **CloudWatch** -> **Alarms**:
   - Click `EC2-HighCPU-Alarm`.
   - Show status: **OK** (green).
   - Show threshold: Triggers when EC2 CPUUtilization exceeds 75% for 5 minutes, routing alert payload to the SNS topic.
2. Navigate to **IAM** -> **Roles**:
   - Show `ApleShahar-EC2-BackendRole`: Policies scoped strictly to S3 Put/Get, SNS Publish, and SSM Parameter Store read (`/apleshahar/*`).
3. Click **User groups**:
   - Show group `Developers` containing members `arlen` and `hansy`, proving least-privilege role segregation without sharing root credentials.

---

## 5. Rapid Examiner Defense Reference

| Frequently Asked Question | Precise Academic Defense |
| :--- | :--- |
| **Why is EC2 in the public subnet instead of private?** | To maintain 100% AWS Free Tier compliance ($0/month). Routing compute egress through an AWS NAT Gateway incurs ~$32/month per AZ. Placing EC2 in a public subnet with strict security groups (allowing only ports 80, 443, 22, 5000) provides egress capability without NAT Gateway costs while the database remains isolated in private subnets. |
| **Why not enable Multi-AZ on RDS?** | Multi-AZ doubles instance-hour consumption and falls outside the AWS RDS Free Tier limit. However, our DB Subnet Group (`apleshahar-db-subnets`) spans both `ap-south-1a` and `ap-south-1b`. In production, enabling Multi-AZ requires toggling a single configuration setting with zero architectural changes. |
| **How did you prevent mixed-content and CORS issues?** | We unified all services under Amazon CloudFront. Edge routing directs `/*` to S3 static hosting, `/api/*` to the EC2 backend, and `/complaints/*` to the S3 media bucket under a single SSL certificate (`https://d1gbzyhd2sdjfm.cloudfront.net`), eliminating cross-origin preflight overhead and mixed-content blocking. |
| **Why use Lambda for image resizing instead of Node.js?** | Node.js operates on a single-threaded event loop. CPU-bound image manipulation (Sharp/libvips) blocks concurrent I/O requests. Decoupling image resizing to event-driven AWS Lambda offloads CPU spikes completely, scaling dynamically per upload. |
| **How are secrets secured without hardcoded `.env` files?** | Configuration and credentials reside in AWS Systems Manager Parameter Store with KMS encryption (`SecureString`). The application loads them dynamically into memory at startup via the attached IAM Instance Profile. |
