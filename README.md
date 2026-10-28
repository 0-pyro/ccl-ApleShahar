# ApleShahar - Cloud-Native Civic Grievance & Municipal Management Platform

This repository contains the full-stack cloud-native codebase for **ApleShahar**, an enterprise civic grievance redressal and municipal facility management platform engineered for municipal corporations (VVCMC / Mumbai Metropolitan Region) and deployed on Amazon Web Services (AWS).

- **Frontend**: React 19 + Vite Single Page Application (`frontend/`)
- **Backend**: Containerized Node.js 20 + Express REST API (`backend/`)
- **Cloud Infrastructure**: AWS Native Architecture in `ap-south-1` (Mumbai) across VPC, EC2, RDS PostgreSQL, S3, CloudFront CDN, Lambda, SNS, SSM Parameter Store, IAM, and CloudWatch.

---

## Documentation Index

- **System Architecture Specification & Diagrams**: [`aws_mig_plan/ARCHITECTURE_DIAGRAM.md`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/ARCHITECTURE_DIAGRAM.md)
- **Live AWS Infrastructure & Resource Inventory**: [`aws_mig_plan/LIVE_INFRASTRUCTURE.md`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/LIVE_INFRASTRUCTURE.md)
- **End-to-End Demonstration Procedure**: [`aws_mig_plan/DEMO_PROCEDURE.md`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/DEMO_PROCEDURE.md)
- **AWS Services Technical Reference**: [`aws_mig_plan/AWS_SERVICES_OVERVIEW.txt`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/AWS_SERVICES_OVERVIEW.txt)
- **Deployment & Verification Guide**: [`DEPLOYMENT_GUIDE.md`](file:///C:/Users/arnav/Desktop/cclmp/DEPLOYMENT_GUIDE.md)

---

## Directory Structure

```text
cclmp/
├── frontend/             # React 19 + Vite client application
│   ├── src/
│   ├── .env.example
│   └── package.json
├── backend/              # Node.js 20 + Express API server (Port 5000)
│   ├── config/           # PostgreSQL connection pool and runtime secrets
│   ├── controllers/      # Route controllers (Auth, Complaints, Facility)
│   ├── routes/           # Express API routes
│   ├── services/         # S3 Upload, SNS Notifications, DB Queries
│   ├── scripts/          # Database schema initialization & verification
│   ├── Dockerfile        # Production Docker container
│   ├── docker-compose.yml# Container orchestration
│   └── package.json
├── aws_mig_plan/         # AWS cloud infrastructure scripts and diagrams
│   ├── deploy-infra.ps1  # Automated AWS CLI infrastructure provisioner (PowerShell)
│   ├── deploy-infra.sh   # Automated AWS CLI infrastructure provisioner (Bash)
│   ├── create-iam-users.ps1 # Team IAM account creation script
│   ├── cleanup.ps1       # Automated resource teardown script
│   ├── lambda/           # Serverless image resizer (Node.js 20.x, Sharp)
│   ├── diagramrefs/      # Official AWS Architecture diagrams (PNG, SVG, HTML)
│   ├── LIVE_INFRASTRUCTURE.md
│   ├── DEMO_PROCEDURE.md
│   └── ARCHITECTURE_DIAGRAM.md
├── DEPLOYMENT_GUIDE.md   # Step-by-step deployment instructions
├── package.json          # Root workspace scripts
└── README.md
```

---

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment Files
Copy the provided `.env.example` templates in both `frontend/` and `backend/`:
```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### 3. Run Development Servers
Start both frontend and backend concurrently from root:
```bash
npm run dev
```

Or run individually:
- Frontend (http://localhost:5173): `npm run dev:frontend`
- Backend (http://localhost:5000): `npm run dev:backend`

---

## Cloud Deployment (AWS)

To review and deploy the live infrastructure on AWS:
1. Review the provisioned resource endpoints in [`aws_mig_plan/LIVE_INFRASTRUCTURE.md`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/LIVE_INFRASTRUCTURE.md).
2. Follow [`DEPLOYMENT_GUIDE.md`](file:///C:/Users/arnav/Desktop/cclmp/DEPLOYMENT_GUIDE.md) to launch the backend container on EC2.
3. Deploy the thumbnail generator in `aws_mig_plan/lambda/` to AWS Lambda.
