# ApleShahar Cloud Workspace

This repository coordinates the full-stack architecture for **ApleShahar**, a civic grievance redressal and public infrastructure platform for municipal corporations (VVCMC / Mumbai Metropolitan Region).

- **Frontend**: React + Vite + Tailwind CSS (`frontend/`)
- **Backend**: Containerized Node.js + Express REST API (`backend/`)
- **Cloud Architecture**: AWS (EC2, VPC, RDS PostgreSQL, S3, IAM, SNS, Lambda, CloudWatch)

---

## Documentation Index

- **Engineering Migration Report (What, Why, How)**: [`aws_mig_plan/PROJECT_MIGRATION_REPORT.md`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/PROJECT_MIGRATION_REPORT.md)
- **Live AWS Infrastructure & Credentials**: [`aws_mig_plan/LIVE_INFRASTRUCTURE.md`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/LIVE_INFRASTRUCTURE.md)
- **Deployment & Verification Guide**: [`DEPLOYMENT_GUIDE.md`](file:///C:/Users/arnav/Desktop/cclmp/DEPLOYMENT_GUIDE.md)
- **Target Architecture Specification**: [`aws_mig_plan/MIGRATION_PLAN.md`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/MIGRATION_PLAN.md)

---

## Directory Structure

```text
cclmp/
├── frontend/             # React + Vite client application (Port 5173)
│   ├── src/
│   ├── .env.example
│   └── package.json
├── backend/              # Node.js + Express API server (Port 5000)
│   ├── config/           # PostgreSQL connection pool and auto-migration
│   ├── controllers/      # Route controllers (Auth, Complaints, Facility)
│   ├── routes/           # Express API routes
│   ├── services/         # S3 Upload, SNS Notifications, DB Queries
│   ├── Dockerfile        # Production container
│   ├── docker-compose.yml# Container orchestration
│   └── package.json
├── aws_mig_plan/         # AWS Migration plans, scripts, and documentation
│   ├── deploy-infra.ps1  # Automated AWS CLI infrastructure provisioner (PowerShell)
│   ├── deploy-infra.sh   # Automated AWS CLI infrastructure provisioner (Bash)
│   ├── create-iam-users.ps1 # Team IAM account creation script
│   ├── cleanup.ps1       # Automated resource teardown script
│   ├── lambda/           # Serverless thumbnail generator
│   ├── LIVE_INFRASTRUCTURE.md
│   └── PROJECT_MIGRATION_REPORT.md
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

To deploy the infrastructure on AWS:
1. Review the provisioned resource endpoints in [`aws_mig_plan/LIVE_INFRASTRUCTURE.md`](file:///C:/Users/arnav/Desktop/cclmp/aws_mig_plan/LIVE_INFRASTRUCTURE.md).
2. Follow Section 5 of [`DEPLOYMENT_GUIDE.md`](file:///C:/Users/arnav/Desktop/cclmp/DEPLOYMENT_GUIDE.md) to launch the backend container on EC2.
3. Deploy the thumbnail generator in `aws_mig_plan/lambda/` to AWS Lambda.
