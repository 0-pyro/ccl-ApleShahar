# ApleShahar - Cloud-Native Civic Grievance & Municipal Management Platform

This repository contains the full-stack cloud-native codebase for **ApleShahar**, an enterprise civic grievance redressal and municipal facility management platform engineered for municipal corporations (VVCMC / Mumbai Metropolitan Region) and deployed on Amazon Web Services (AWS).

- **Frontend**: React 19 + Vite Single Page Application (`frontend/`)
- **Backend**: Containerized Node.js 20 + Express REST API (`backend/`)
- **Cloud Infrastructure**: Native AWS architecture in `ap-south-1` (Mumbai) across VPC, EC2, RDS PostgreSQL, S3, CloudFront CDN, Lambda, SNS, SSM Parameter Store, IAM, and CloudWatch.

---

## 📖 Comprehensive Documentation (Single Source of Truth)

All architectural specifications, problem statements, application workflows, AWS service technical deep-dives, live infrastructure inventories, deployment guides, and demonstration procedures are consolidated into:

👉 **[Master System Documentation & Infrastructure Specification (`docs/README.md`)](docs/README.md)**

---

## Directory Structure

```text
CCLMP/
├── frontend/             # React 19 + Vite Single Page Application (Port 5173)
│   ├── src/              # UI Components, centralized API client, router
│   ├── .env.example      # Frontend environment template
│   └── package.json
├── backend/              # Node.js 20 + Express API server (Port 5000)
│   ├── config/           # PostgreSQL pool with auto-schema DDL & SSM parameter loader
│   ├── controllers/      # Route controllers (Auth, Complaints, Facility)
│   ├── routes/           # Express REST endpoints (/api/auth, /api/complaints, etc.)
│   ├── services/         # S3 Upload, SNS Notifications, DB Queries
│   ├── scripts/          # Database schema initialization & verification
│   ├── Dockerfile        # Production Docker container
│   ├── docker-compose.yml# Container orchestration
│   └── package.json
├── docs/                 # Single Source of Truth Documentation & Cloud Assets
│   ├── README.md         # Master System & Infrastructure Specification
│   ├── deploy-infra.ps1  # Automated AWS CLI infrastructure provisioner (PowerShell)
│   ├── deploy-infra.sh   # Automated AWS CLI infrastructure provisioner (Bash)
│   ├── cleanup.ps1       # Automated resource teardown script
│   ├── create-iam-users.ps1 # Team IAM user provisioning
│   ├── lambda/           # Serverless image resizer (Node.js 20.x, Sharp)
│   ├── architecture.mmd  # Mermaid architecture source
│   ├── architecture_diagram.png # High-resolution architecture blueprint
│   ├── architecture_diagram.svg # Scalable vector architecture diagram
│   └── diagramrefs/      # Visual architecture diagrams and reference exports
├── package.json          # Root workspace coordination scripts
└── README.md             # Project landing page & quickstart
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

## Cloud Deployment & Operations

To provision infrastructure, launch containers on EC2, configure Lambda, and run verification:
1. Follow the step-by-step instructions in **[docs/README.md - Section 7: Complete Deployment Guide](docs/README.md#7-complete-deployment--infrastructure-provisioning-guide)**.
2. Review live cloud endpoints in **[docs/README.md - Section 6: Live AWS Infrastructure Inventory](docs/README.md#6-live-aws-infrastructure--resource-inventory)**.
3. Conduct technical evaluation using **[docs/README.md - Section 8: Demonstration & Verification Procedure](docs/README.md#8-end-to-end-demonstration--verification-procedure)**.
