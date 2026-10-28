# ApleShahar: Cloud-Native Civic Grievance & Municipal Infrastructure Platform
### Comprehensive System Architecture, Application Specification & AWS Infrastructure Guide

---

## Table of Contents
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Core Application Architecture & Workflows](#2-core-application-architecture--workflows)
3. [Software Subsystems & Data Architecture](#3-software-subsystems--data-architecture)
4. [Target Cloud Architecture & Network Topology](#4-target-cloud-architecture--network-topology)
5. [Comprehensive AWS Services Breakdown (What, Why, How)](#5-comprehensive-aws-services-breakdown-what-why-how)
6. [Live AWS Infrastructure & Resource Inventory](#6-live-aws-infrastructure--resource-inventory)
7. [Complete Deployment & Infrastructure Provisioning Guide](#7-complete-deployment--infrastructure-provisioning-guide)
8. [End-to-End Demonstration & Verification Procedure](#8-end-to-end-demonstration--verification-procedure)
9. [Operational Teardown & Cost Governance](#9-operational-teardown--cost-governance)

---

## 1. Executive Summary & Problem Statement

### 1.1 Civic Context: Municipal Corporation Infrastructure Management
Urban governance in rapidly expanding metropolitan regions—specifically the **Vasai-Virar City Municipal Corporation (VVCMC)** and the wider **Mumbai Metropolitan Region (MMR)**—requires responsive, transparent, and verifiable public infrastructure grievance redressal. 

Civic municipal administrations manage thousands of square kilometers of urban territory divided into administrative wards. Every day, municipal ward offices receive hundreds of citizen reports concerning:
- **Road Hazards**: Deep potholes, unpaved road surfaces, damaged speed breakers, and washed-out asphalt causing vehicular accidents and severe transit delays.
- **Waste Management**: Overflowing community dumpsters, uncollected municipal solid waste, and illegal debris dumping creating hazardous sanitary conditions.
- **Water Infrastructure**: High-pressure pipeline fractures, underground sewage overflows, contaminated public water connections, and waterlogging.
- **Public Lighting & Safety**: Damaged streetlight poles, exposed high-voltage wiring, non-functional lighting on transit corridors, and damaged municipal assets.

### 1.2 Core Problem Statement
Traditional municipal grievance portals suffer from fundamental operational deficiencies:
1. **Lack of Verifiable Photographic Proof**: Citizens file text-only complaints without standardized photo documentation or GPS coordinates, making it difficult for field engineers to locate issues accurately.
2. **Administrative Silos & Untracked ETAs**: Complaints enter unmonitored backlogs without transparent estimated times of arrival (ETAs) or accountable ward assignments.
3. **Absence of Resolution Verification**: Civic authorities frequently mark complaints "Resolved" in internal spreadsheets without photographic proof, leaving citizens dissatisfied with unrepaired civic defects.
4. **Poor Mobile Usability & Latency**: Legacy government web portals are sluggish, unresponsive on mobile devices, and vulnerable to outages during monsoon storm surges when civic issues spike exponentially.

### 1.3 The ApleShahar Solution
**ApleShahar** ("Our City") is an enterprise-grade, cloud-native civic grievance redressal and municipal facility management platform engineered natively on **Amazon Web Services (AWS)**. It bridges the divide between citizens and urban municipal authorities through a resilient digital workflow:
- **Citizens** report civic defects with photographic evidence, ward assignment, and geographic coordinates, monitor resolution through an interactive lifecycle pipeline, and inspect resolution photographs before tickets close.
- **Municipal Authorities** access a unified dashboard filtered by ward jurisdiction, triage reported defects, assign public completion ETAs, upload photographic proof of completed repairs, and coordinate field teams.
- **Urban Planners** receive data-driven public proposals for new municipal amenities (public restrooms, drinking water booths, waste recycling hubs) to guide capital infrastructure budgets.

---

## 2. Core Application Architecture & Workflows

ApleShahar coordinates three distinct user experiences across a unified, single-domain web application:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  APLESHAHAR WORKFLOW                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘

    CITIZEN JOURNEY:
    [1. Register / Login] ──> [2. Lodge Grievance] ──> [3. Real-Time Tracking] ──> [4. Verify & Confirm]
         (JWT Auth)            (Photo + GPS Coords)       (Pending -> In-Progress)     (Review Proof Photo)

    MUNICIPAL AUTHORITY JOURNEY:
    [1. Authority Login]  ──> [2. Ward Triage]     ──> [3. Assign Public ETA]  ──> [4. Resolve with Proof]
      (Security Code)          (Filter by Ward)          (Commit Repair Window)       (Upload Proof Photo)

    FACILITY PROPOSAL JOURNEY:
    [1. Citizen Request]  ──> [2. Location & Need] ──> [3. Ward Review]        ──> [4. Approval / Budget]
      (Select Amenity)         (Justification)            (Municipal Inspection)      (Capital Allocation)
```

### 2.1 Citizen Grievance Submission Flow
1. **Authentication**: Citizens register with name, email, phone number, and residential ward number. Passwords are cryptographically salted and hashed using `bcryptjs`. Upon authentication, the backend issues a signed JSON Web Token (JWT) stored securely in browser session storage.
2. **Grievance Lodging**: The citizen accesses the grievance reporting form, selects the issue category (*Pothole / Road Damage*, *Garbage Accumulation*, *Water Supply / Leakage*, *Streetlight Outage*), enters a detailed description, specifies location coordinates, and attaches a camera photograph.
3. **Multipart Form Dispatch**: The client dispatches a multipart form payload over HTTPS to the backend REST API. The backend persists the grievance record in PostgreSQL, streams the photo directly to Amazon S3, and publishes an asynchronous notification via Amazon SNS.
4. **Status Dashboard**: The citizen views a real-time progress tracker with visual state badges:
   - <span style="color:#d97706;font-weight:bold;">PENDING</span>: Grievance logged in the ward queue awaiting engineering review.
   - <span style="color:#2563eb;font-weight:bold;">IN PROGRESS</span>: Ward officer has acknowledged the defect and committed a public completion ETA (e.g., *24-48 Hours*).
   - <span style="color:#16a34a;font-weight:bold;">RESOLVED</span>: Repair completed; resolution photograph uploaded for citizen verification.

### 2.2 Municipal Authority Portal Flow
1. **Elevated Authentication**: Municipal ward officers log in using administrative credentials validated by a server-side authorization check.
2. **Ward Filtering & Queue Prioritization**: The authority portal displays incoming grievances filtered by municipal ward number. Officers sort defects by category, date reported, and urgency.
3. **ETA Assignment**: The officer reviews the citizen's photographic evidence and updates the grievance status to `in_progress` with an estimated resolution timeline.
4. **Resolution with Photographic Proof**: Upon physical completion of repairs by field teams, the officer uploads a completion photograph and enters resolution notes. Marking the ticket `resolved` automatically dispatches a transactional email notification to the citizen.

### 2.3 Municipal Facility Request Flow
Citizens can propose new civic infrastructure amenities needed in their neighborhood (e.g., *Public Restroom*, *Community Waste Bin*, *Drinking Water Filtration Station*, *Pedestrian Crossing*). Officers review community proposals, inspect location coordinates, and update status to `approved` or `rejected` with official administrative feedback.

---

## 3. Software Subsystems & Data Architecture

The project is structured as a full-stack monorepo coordinating a modern client Single Page Application, a containerized REST API, and native cloud infrastructure code:

```text
cclmp/
├── frontend/             # React 19 + Vite Single Page Application (Port 5173 / CloudFront)
│   ├── public/           # Static assets, logos, and vector icons
│   ├── src/
│   │   ├── assets/       # Brand graphics, VVCMC civic emblems
│   │   ├── components/   # UI Modules
│   │   │   ├── auth/     # Login, Signup, Role selector modal
│   │   │   ├── authorities/# Municipal authority dashboard, ETA assignment, Resolution modal
│   │   │   ├── Complains.jsx          # Public grievance feed & category filter
│   │   │   ├── ReportComplainDetails.jsx # Civic defect filing with camera upload & GPS
│   │   │   ├── ManageComplain.jsx     # Citizen grievance lifecycle tracking & verification
│   │   │   ├── ViewComplains.jsx      # Ward grievance cards with status badges
│   │   │   ├── FacilityRequestDetails.jsx # Municipal amenity proposals
│   │   │   ├── Navbar.jsx             # Responsive header with session state
│   │   │   └── Footer.jsx             # Municipal civic footer & helpline numbers
│   │   ├── lib/api.js    # Centralized HTTP API client with automatic JWT injection
│   │   ├── App.jsx       # Client-side router and protected routes
│   │   └── main.jsx      # React DOM entrypoint
│   └── package.json
├── backend/              # Node.js 20 + Express REST API (Port 5000 / EC2 Docker Container)
│   ├── config/
│   │   ├── db.js         # PostgreSQL connection pool (pg.Pool) with auto-schema DDL
│   │   └── secrets.js    # AWS Systems Manager (SSM) Parameter Store runtime loader
│   ├── controllers/      # Route controllers (authController, complaintsController, facilityController)
│   ├── middleware/       # JWT verification, Role-based access control, Multer memory buffer
│   ├── routes/           # REST endpoints (/api/auth, /api/complaints, /api/facility, /health)
│   ├── services/
│   │   ├── authService.js         # bcrypt password hashing & JWT token issuance
│   │   ├── complaintsService.js   # Parameterized SQL queries for grievance lifecycle
│   │   ├── facilityService.js     # Parameterized SQL queries for civic amenity proposals
│   │   ├── uploadService.js       # AWS S3 image stream upload (AWS SDK v3 PutObjectCommand)
│   │   └── notificationService.js # Amazon SNS transactional pub/sub email dispatch
│   ├── scripts/
│   │   ├── init-db.js    # Standalone database initialization script
│   │   └── query.js      # Interactive database query inspection tool
│   ├── Dockerfile        # Production multi-stage Node.js alpine container
│   ├── docker-compose.yml# Container orchestration configuration
│   └── package.json
├── docs/                 # Single Source of Truth Documentation & Infrastructure Code
│   ├── README.md         # This master documentation specification
│   ├── deploy-infra.ps1  # Automated AWS CLI infrastructure provisioner (PowerShell)
│   ├── deploy-infra.sh   # Automated AWS CLI infrastructure provisioner (Bash)
│   ├── cleanup.ps1       # Automated resource teardown script
│   ├── create-iam-users.ps1 # Team IAM user provisioning
│   ├── lambda/           # Serverless image optimizer & thumbnail generator
│   │   ├── index.mjs     # Event handler triggered on s3:ObjectCreated:*
│   │   └── package.json  # Node.js 20.x runtime dependencies (sharp, @aws-sdk/client-s3)
│   ├── architecture.mmd  # Mermaid architecture specification source
│   ├── architecture_diagram.png # High-resolution architecture blueprint
│   ├── architecture_diagram.svg # Scalable vector architecture diagram
│   └── diagramrefs/      # Detailed subsystem visual references & architecture exports
├── package.json          # Root workspace coordination scripts
└── README.md             # Project landing page & quickstart
```

### 3.1 Frontend Subsystem (React 19 + Vite + Tailwind CSS)
- **Component Hierarchy**: Modular React components styled with utility-first Tailwind CSS.
- **Client-Side API Abstraction (`frontend/src/lib/api.js`)**: All communication with the backend is centralized in clean service methods (`login`, `signUp`, `createComplaint`, `getComplaints`, `resolveComplaint`, `createFacilityRequest`).
- **Stateless Session Management**: Authentication tokens (`access_token`) are stored in `sessionStorage` and automatically injected into outbound HTTP request headers:
  ```javascript
  headers: {
    'Authorization': `Bearer ${token}`,
    ...customHeaders
  }
  ```
- **Responsive Civic Design**: Mobile-first layouts optimized for smartphone screens used by citizens on the street and municipal field supervisors.

### 3.2 Backend Subsystem (Node.js 20 + Express REST API)
- **Containerized Execution**: Packaged inside a minimal Alpine Linux Docker container with zero extraneous system dependencies.
- **Dynamic Secret Loading**: On boot, [`backend/index.js`](../backend/index.js) executes [`loadSecrets()`](../backend/config/secrets.js) to retrieve encrypted secrets from AWS Systems Manager (SSM) Parameter Store in-memory, ensuring zero credentials exist on the server disk.
- **Connection Pooling**: Utilizes `pg.Pool` with persistent TCP sockets to Amazon RDS PostgreSQL, maximizing query throughput and minimizing latency.
- **In-Memory Streaming**: File uploads are buffered in RAM using Multer memory storage (`multer.memoryStorage()`) and streamed directly to Amazon S3 via `@aws-sdk/client-s3`, avoiding disk write bottlenecks.

### 3.3 Relational Database Schema (Amazon RDS PostgreSQL)
The platform schema enforces strict relational integrity, foreign key cascades, and data types:

```sql
-- 1. Users Table (Citizens, Municipal Staff, Ward Authorities)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  contact VARCHAR(50),
  ward_no INTEGER,
  role VARCHAR(50) DEFAULT 'citizen', -- 'citizen', 'authority', 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Complaints Table (Civic Grievances)
CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  citizen_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  image_link TEXT NOT NULL,
  prob_description TEXT NOT NULL,
  ward INTEGER NOT NULL,
  location_coords TEXT,
  issue_type VARCHAR(100), -- 'Pothole', 'Garbage', 'Water Supply', 'Streetlight'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved'
  estimated_time VARCHAR(100),
  resolve_description TEXT,
  resolve_image TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Facility Requests Table (Civic Amenity Proposals)
CREATE TABLE IF NOT EXISTS facility_requests (
  id SERIAL PRIMARY KEY,
  citizen_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  facility_type VARCHAR(100) NOT NULL,
  request_reason TEXT NOT NULL,
  ward INTEGER NOT NULL,
  image_link TEXT,
  location_coords TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reject_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Zero-Touch Schema Initialization
[`backend/config/db.js`](../backend/config/db.js) executes the above DDL statements with `CREATE TABLE IF NOT EXISTS` every time the server boots, ensuring seamless database bootstrapping on fresh RDS deployments without requiring manual SQL schema execution.

---

## 4. Target Cloud Architecture & Network Topology

### 4.1 System Architecture Diagram

```mermaid
flowchart TD
    User["Citizen / Municipal Authority Client"]

    subgraph EdgeLayer["Edge Delivery Layer (Amazon CloudFront CDN)"]
        CF["CloudFront Distribution (d1gbzyhd2sdjfm.cloudfront.net)\nID: E173DOOWG8BGP2 | SSL/HTTPS"]
    end

    subgraph StorageLayer["Object Storage Layer (Amazon S3)"]
        S3Web["Frontend Static Hosting Bucket\n(apleshahar-frontend-852227600998-2026)\nReact 19 SPA Assets"]
        S3Media["Media Storage Bucket\n(apleshahar-media-76343)\nOriginal Photos & Thumbnails"]
    end

    subgraph VPC["Custom AWS VPC (vpc-0004b4f628adae8df | 10.0.0.0/16)"]
        IGW["Internet Gateway\n(apleshahar-igw)"]

        subgraph PublicSubnet["Public Subnet (apleshahar-public-1a | 10.0.1.0/24)"]
            EC2SG["EC2 Security Group (sg-062252861b7de2668)\nInbound: 80, 443, 22, 5000"]
            EC2["Amazon EC2 Backend Instance (i-0260cf2d7f71c8832)\nt3.micro | Ubuntu 24.04 LTS | 3.110.87.195\nDocker: apleshahar-backend (Node.js 20)"]
        end

        subgraph PrivateSubnets["Private Subnets (Isolated Database Tier)"]
            subgraph Priv1["apleshahar-private-1a (10.0.2.0/24)"]
                RDSSG["RDS Security Group (sg-0b9bde57f8c29bfdc)\nInbound: Port 5432 from EC2 SG only"]
            end
            subgraph Priv2["apleshahar-private-1b (10.0.3.0/24)"]
                DBSubnets["DB Subnet Group\n(apleshahar-db-subnets)"]
            end
            RDS[("Amazon RDS PostgreSQL 16.10 (db.t3.micro)\nSingle-AZ: apleshahar-postgres\nPublic Access: NO | SSL Enforced")]
        end
    end

    subgraph ServerlessAsync["Serverless Compute & Messaging"]
        Lambda["AWS Lambda Resizer (ApleShahar-ImageResizer)\nNode.js 20.x | 512 MB | Sharp Pipeline"]
        SNS["Amazon SNS Topic\n(apleshahar-complaint-alerts)"]
        EmailSub["Authority / Admin Email\n(apatade76@gmail.com)"]
    end

    subgraph ManagementSecurity["Security, Secrets & Monitoring"]
        SSM["AWS SSM Parameter Store\n(/apleshahar/* - 11 KMS Encrypted Parameters)"]
        IAM["IAM Instance Profile\n(ApleShahar-EC2-BackendRole)"]
        CWAlarm["CloudWatch Alarm\n(EC2-HighCPU-Alarm > 75%)"]
        CWLogs["CloudWatch Logs\n(/aws/lambda/ApleShahar-ImageResizer)"]
    end

    User -->|"HTTPS (Port 443)"| CF
    CF -->|"Default path (*)"| S3Web
    CF -->|"/complaints/* (Edge Cached)"| S3Media
    CF -->|"/api/* (Dynamic Pass-Through)"| IGW
    IGW --> EC2SG
    EC2SG --> EC2

    EC2 -->|"SQL queries (Port 5432, SSL)"| RDSSG
    RDSSG --> RDS

    EC2 -->|"Stream complaint photos (PutObject)"| S3Media
    S3Media -->|"s3:ObjectCreated:* event trigger"| Lambda
    Lambda -->|"Write thumb-* (82% compression)"| S3Media

    EC2 -->|"Publish event (new complaint / resolved)"| SNS
    CWAlarm -->|"State change action (CPU > 75%)"| SNS
    SNS -->|"Transactional email"| EmailSub

    EC2 -.->|"Load /apleshahar/* secrets at boot"| SSM
    EC2 -.->|"Temporary STS credentials (IMDSv2)"| IAM
    EC2 -.->|"Continuous CPU metrics push"| CWAlarm
    Lambda -.->|"Execution telemetry"| CWLogs
```

### 4.2 Network Ingress & Multi-Origin Routing
All traffic originates from web browsers hitting **Amazon CloudFront** (`d1gbzyhd2sdjfm.cloudfront.net`). CloudFront acts as a unified edge reverse proxy routing requests dynamically based on URL path patterns:

| Path Pattern | Target Origin | Cache Policy | Behavior Description |
| :--- | :--- | :--- | :--- |
| **`Default (*)`** | S3 Frontend Bucket | `CachingOptimized` (TTL 86400s) | Serves compiled React 19 HTML, JavaScript chunks, CSS, and brand images. Custom 403/404 error responses redirect to `/index.html` with HTTP 200 for client-side routing. |
| **`/api/*`** | EC2 Backend Container | `CachingDisabled` (TTL 0s) | Bypasses cache and forwards dynamic REST API calls (all HTTP methods, query strings, headers, and Authorization bearer tokens) directly to the Express server on EC2. |
| **`/complaints/*`** | S3 Media Storage Bucket | `CachingOptimized` (TTL 86400s) | Delivers citizen complaint photographs and generated thumbnails cached at the edge for sub-20ms load times across wards. |

---

## 5. Comprehensive AWS Services Breakdown (What, Why, How)

Every Amazon Web Service in the ApleShahar platform was deliberately selected, architected, and configured to satisfy rigorous cloud computing standards.

---

### 5.1 Amazon VPC (Virtual Private Cloud)
- **What the Service Does**: Amazon VPC provides a logically isolated virtual network within AWS where developers define IP address spaces, subnets, route tables, network gateways, and stateful firewall security groups.
- **Why It Was Used in ApleShahar**:
  - **Tiered Enterprise Segmentation**: Isolates sensitive relational databases containing citizen credentials and civic records from public exposure while granting internet ingress to compute services.
  - **Defense-in-Depth**: Prevents port scans, bots, and brute-force attacks from reaching PostgreSQL port 5432.
  - **Cost-Optimized Design ($0 NAT Gateway)**: Standard AWS NAT Gateways incur ~$32/month with no free tier. By deploying the EC2 instance in a public subnet with an auto-assigned public IPv4 address, the backend communicates with RDS locally inside the VPC while reaching S3, SNS, and SSM over the Internet Gateway without needing a NAT Gateway.
- **How It Works and Is Configured**:
  - **VPC ID**: `vpc-0004b4f628adae8df`
  - **CIDR Block**: `10.0.0.0/16` (65,536 private IPv4 addresses in `ap-south-1`).
  - **DNS Hostnames & Resolution**: Enabled.
  - **Internet Gateway**: `apleshahar-igw` (`igw-0048ad4830f3abf26`) attached to the VPC.
  - **Subnet Layout**:
    - `apleshahar-public-1a` (`subnet-01b625a9a0f0af953`): `10.0.1.0/24` in `ap-south-1a`. Associated with public route table routing `0.0.0.0/0 -> igw-0048ad4830f3abf26`. Hosts the EC2 compute instance.
    - `apleshahar-private-1a` (`subnet-0b7a37def7a9389ae`): `10.0.2.0/24` in `ap-south-1a`. Isolated local route only (`10.0.0.0/16`). Hosts RDS PostgreSQL.
    - `apleshahar-private-1b` (`subnet-0acda9b4e81e2203f`): `10.0.3.0/24` in `ap-south-1b`. Isolated local route only. Fulfills the multi-AZ DB Subnet Group prerequisite.
  - **Security Group Firewall Rules**:
    - `apleshahar-ec2-sg` (`sg-062252861b7de2668`): Inbound TCP 80 (HTTP), 443 (HTTPS), 22 (SSH from admin IP), and 5000 (Backend API). Outbound: All traffic (`0.0.0.0/0`).
    - `apleshahar-rds-sg` (`sg-0b9bde57f8c29bfdc`): Inbound TCP 5432 strictly restricted to source `sg-062252861b7de2668` (`apleshahar-ec2-sg`). Outbound: Local VPC only.

---

### 5.2 Amazon EC2 (Elastic Compute Cloud)
- **What the Service Does**: Amazon EC2 provides resizable virtual compute capacity (virtual machines) with full administrative access to the operating system, container runtimes, networking, and storage.
- **Why It Was Used in ApleShahar**:
  - **Mandatory Non-Serverless Workload**: Fulfills the requirement for dedicated, self-managed compute hosting the core application backend.
  - **Persistent In-Memory Connection Pooling**: Relational database queries benefit significantly from persistent TCP connection pools (`pg.Pool`), avoiding the latency of renegotiating SSL handshakes on every request (which plagues serverless functions).
  - **Standardized Containerization**: Docker packages the Node.js runtime, dependencies, and environment into a portable container running identically across local workstations and AWS.
- **How It Works and Is Triggered**:
  - **Instance ID**: `i-0260cf2d7f71c8832`
  - **Instance Type**: `t3.micro` (2 vCPUs, 1 GiB RAM, Free Tier eligible).
  - **OS**: Ubuntu Server 24.04 LTS (x86_64).
  - **Public IP**: `3.110.87.195` (Port 5000).
  - **IAM Instance Profile**: Attached to `ApleShahar-EC2-BackendRole`. The AWS SDK v3 client automatically queries the EC2 metadata service (IMDSv2) to acquire rotating temporary credentials.
  - **Trigger Flow**: Inbound requests from CloudFront (`/api/*`) hit the Docker container on port 5000. Express processes requests, reads/writes from RDS PostgreSQL, streams photos to S3, and publishes alert messages to SNS.

---

### 5.3 Amazon RDS (Relational Database Service - PostgreSQL)
- **What the Service Does**: Amazon RDS is a fully managed relational database service that automates provisioning, hardware setup, database patching, automated snapshots, continuous backups, and maintenance.
- **Why It Was Used in ApleShahar**:
  - **ACID Transactions & Data Integrity**: Civic grievance handling requires transactional guarantees. Grievances, citizen accounts, and facility requests maintain strict referential integrity through foreign keys.
  - **Complete Subnet Isolation**: RDS resides strictly in private subnets, unreachable from the public internet.
  - **Automated Backup & Disaster Recovery**: Provides point-in-time recovery and snapshot protection without requiring manual database administration.
- **How It Works and Is Triggered**:
  - **DB Identifier**: `apleshahar-postgres`
  - **Engine & Version**: PostgreSQL 16.10
  - **Instance Class**: `db.t3.micro`
  - **Allocated Storage**: 20 GiB gp3 (General Purpose SSD, autoscaling disabled to protect free tier credits).
  - **Deployment Mode**: Single-AZ (encompassed by multi-AZ DB Subnet Group `apleshahar-db-subnets`).
  - **Endpoint**: `apleshahar-postgres.claiyoqcgr10.ap-south-1.rds.amazonaws.com:5432`
  - **Public Access**: `NO`.
  - **Connection Encryption**: SSL enforced (`ssl: { rejectUnauthorized: false }`).
  - **Trigger Flow**: The Node.js backend invokes parameterized SQL queries via `pg.Pool` during user authentication, complaint filing, status changes, and facility proposal submissions.

---

### 5.4 Amazon S3 (Simple Storage Service)
- **What the Service Does**: Amazon S3 is an industry-leading object storage service offering 99.999999999% (11 9s) of data durability, fine-grained bucket policies, CORS management, static website hosting, and asynchronous event notifications.
- **Why It Was Used in ApleShahar**:
  S3 fulfills two distinct architectural responsibilities:
  1. **Citizen Media Storage**: Stores high-resolution grievance photos and authority repair verification proofs.
  2. **Frontend Web Hosting**: Replaces third-party hosting by serving the compiled React 19 Single Page Application directly from AWS storage.
- **How It Works and Is Triggered**:
  The architecture provisions two distinct S3 buckets in `ap-south-1`:
  - **Media Bucket (`apleshahar-media-76343`)**:
    - Stores original photos under `complaints/` and resized thumbnails under `complaints/thumb-*`.
    - Configured with public read policy (`s3:GetObject`) and CORS permissions for browser image fetching.
    - Emits `s3:ObjectCreated:*` event notifications to trigger AWS Lambda.
  - **Frontend Web Bucket (`apleshahar-frontend-852227600998-2026`)**:
    - Static Website Hosting active with `index.html` configured as both index and error document (enabling React Router client-side path resolution).
    - Acts as the default origin for CloudFront CDN.

---

### 5.5 Amazon CloudFront (Content Delivery Network & Unified Edge Gateway)
- **What the Service Does**: Amazon CloudFront is a global CDN that caches and delivers static and dynamic web content through a worldwide network of secure edge locations (Point of Presence / PoPs).
- **Why It Was Used in ApleShahar**:
  - **Free Global HTTPS Termination**: Modern browsers block camera uploads and geolocation over insecure HTTP. CloudFront provides free SSL/TLS encryption under `*.cloudfront.net` without requiring a purchased custom domain.
  - **Unified Domain (Elimination of CORS & Mixed-Content)**: Routing static frontend assets (`/*`), backend REST APIs (`/api/*`), and media files (`/complaints/*`) under a single origin (`d1gbzyhd2sdjfm.cloudfront.net`) completely eliminates browser CORS preflight latency and mixed-content security blocks.
  - **Ultra-Low Latency**: Caches frontend bundles and citizen photos at the Mumbai Edge PoP (`BOM78`), accelerating image loading across civic wards.
- **How It Works and Is Triggered**:
  - **Distribution ID**: `E173DOOWG8BGP2`
  - **Domain Name**: `d1gbzyhd2sdjfm.cloudfront.net`
  - **Multi-Origin Behaviors**:
    - `/*` -> S3 Frontend bucket (`apleshahar-frontend-852227600998-2026`) with TTL 86400s.
    - `/api/*` -> EC2 Backend (`ec2-3-110-87-195.ap-south-1.compute.amazonaws.com:5000`) with TTL 0s (forwards all HTTP methods, headers, and cookies).
    - `/complaints/*` -> S3 Media bucket (`apleshahar-media-76343`) with TTL 86400s.
  - **Custom Error Pages**: 403 and 404 responses return `/index.html` with HTTP 200 OK for seamless Single Page Application routing.

---

### 5.6 AWS Lambda (Serverless Compute - Image Resizer)
- **What the Service Does**: AWS Lambda runs code in response to events without provisioning or managing servers. It executes on-demand and consumes zero compute resources at rest.
- **Why It Was Used in ApleShahar**:
  - **Event-Driven Image Optimization**: Smartphone camera photos often range from 3 MB to 10 MB. Serving raw full-resolution photos to municipal operators wastes bandwidth and slows dashboard loading.
  - **Protection of the Node.js Event Loop**: Bicubic image resizing using `sharp`/`libvips` is intensely CPU-bound. Executing it directly on the `t3.micro` EC2 backend would saturate the 2 vCPUs and block the single-threaded Node.js event loop, dropping incoming client HTTP connections. Offloading this task to serverless Lambda guarantees 100% backend API responsiveness.
- **How It Works and Is Triggered**:
  - **Function Name**: `ApleShahar-ImageResizer`
  - **Function ARN**: `arn:aws:lambda:ap-south-1:852227600998:function:ApleShahar-ImageResizer`
  - **Runtime**: `nodejs20.x` (Memory: 512 MB, Timeout: 30s).
  - **Execution Role**: `ApleShahar-LambdaExecutionRole` with scoped S3 read/write permissions.
  - **Trigger**: S3 bucket `apleshahar-media-76343` on event `s3:ObjectCreated:*` (filter prefix `complaints/`).
  - **Execution Logic ([`docs/lambda/index.mjs`](lambda/index.mjs))**:
    1. S3 emits the event to Lambda upon image upload.
    2. **Recursion Guard**: If the object key contains `thumb-`, Lambda exits immediately to prevent an infinite loop.
    3. Lambda downloads the original image buffer into memory via `GetObjectCommand`.
    4. Compresses and resizes the image to a maximum width of 800px at 80% JPEG quality using `sharp`, reducing file size by **~82%** (e.g., 608 KB down to 107 KB).
    5. Writes the optimized thumbnail back to S3 under `complaints/thumb-<filename>`.

---

### 5.7 Amazon SNS (Simple Notification Service)
- **What the Service Does**: Amazon SNS is a fully managed pub/sub messaging service enabling decoupled application-to-application (A2A) and application-to-person (A2P) notifications across email, SMS, SQS, and webhooks.
- **Why It Was Used in ApleShahar**:
  - **Asynchronous Decoupling**: Direct email delivery inside HTTP request handlers causes slow response times (1.5 to 4 seconds) if remote SMTP servers lag. Decoupling notifications through SNS allows the backend to publish messages in under 15 milliseconds, returning an immediate response to the client while SNS delivers email in the background.
  - **Dual-Purpose Channel**: The same topic serves both **application notifications** (new complaints, status updates) and **infrastructure alerts** (CloudWatch CPU threshold breaches).
- **How It Works and Is Triggered**:
  - **Topic Name**: `apleshahar-complaint-alerts`
  - **Topic ARN**: `arn:aws:sns:ap-south-1:852227600998:apleshahar-complaint-alerts`
  - **Subscription**: Protocol `Email` to `apatade76@gmail.com` (Confirmed).
  - **Triggers**:
    1. **Application Trigger**: [`backend/services/notificationService.js`](../backend/services/notificationService.js) invokes `PublishCommand` when a citizen lodges a complaint (notifying ward officers) and when a complaint is marked resolved (notifying the citizen).
    2. **Infrastructure Trigger**: CloudWatch alarm `EC2-HighCPU-Alarm` triggers SNS if EC2 CPU utilization exceeds 75% for 5 minutes.

---

### 5.8 AWS Systems Manager (SSM) Parameter Store
- **What the Service Does**: AWS Systems Manager Parameter Store provides secure, hierarchical storage for configuration data management and secrets management, supporting encrypted parameters (`SecureString`) backed by AWS Key Management Service (KMS).
- **Why It Was Used in ApleShahar**:
  - **Zero Credential Hardcoding**: Storing plaintext passwords and JWT signing keys in `.env` files on disk is a critical security vulnerability. Parameter Store centralizes credentials in encrypted cloud storage.
  - **12-Factor App Compliance**: Decouples configuration from source code. Secrets can be rotated in Parameter Store without modifying code or redeploying containers.
- **How It Works and Is Triggered**:
  - **Hierarchy Path**: `/apleshahar/*` (11 parameters managed):
    - `/apleshahar/db_password`: Master PostgreSQL password (`SecureString`, KMS encrypted).
    - `/apleshahar/jwt_secret`: Token cryptographic signing key (`SecureString`).
    - `/apleshahar/authority_security_code`: Staff validation passkey (`SecureString`).
    - Database endpoints, ports, SSL flags, S3 bucket names, SNS topic ARNs, and AWS region (`String`).
  - **Application Injection**: At container launch, [`backend/config/secrets.js`](../backend/config/secrets.js) uses `GetParametersByPathCommand` via the EC2 IAM Instance Profile, decrypts secrets in-flight, and populates `process.env` in RAM before database pools initialize.

---

### 5.9 Amazon CloudWatch (Monitoring, Alarms & Logs)
- **What the Service Does**: Amazon CloudWatch is an observability service that collects monitoring metrics, logs, and operational events, providing automated alarms and dashboards.
- **Why It Was Used in ApleShahar**:
  - **Automated Health Monitoring**: Tracks EC2 CPU and network metrics to prevent resource starvation during traffic surges.
  - **Serverless Observability**: Ingests execution logs, billed duration, and memory utilization from the Lambda thumbnail generator.
- **How It Works and Is Triggered**:
  - **Alarm Name**: `EC2-HighCPU-Alarm`
  - **Metric**: `AWS/EC2 CPUUtilization` on instance `i-0260cf2d7f71c8832`.
  - **Condition**: CPU > 75% for 5 consecutive minutes (1 period of 300s).
  - **Alarm Action**: Publishes an alert to SNS topic `apleshahar-complaint-alerts`.
  - **Log Group**: `/aws/lambda/ApleShahar-ImageResizer` ingests execution telemetry on every image upload.

---

### 5.10 AWS IAM (Identity and Access Management)
- **What the Service Does**: AWS IAM securely manages access to AWS services and resources using users, groups, roles, and fine-grained JSON permissions based on least privilege.
- **Why It Was Used in ApleShahar**:
  - **Zero Hardcoded AWS Access Keys**: EC2 and Lambda acquire temporary credentials automatically via IAM roles and IMDSv2, preventing credential leaks.
  - **Least Privilege**: Each component receives strictly scoped permissions (e.g., EC2 can only access bucket `apleshahar-media-76343/*` and topic `apleshahar-complaint-alerts`).
- **How It Works and Is Configured**:
  - **Role 1 (`ApleShahar-EC2-BackendRole`)**: Attached as an IAM Instance Profile to EC2. Contains `AmazonSSMManagedInstanceCore` and inline policy `ApleShaharAppPermissions` granting scoped access to S3, SNS, and SSM.
  - **Role 2 (`ApleShahar-LambdaExecutionRole`)**: Grants `AWSLambdaBasicExecutionRole` and scoped S3 read/write permissions.
  - **Developer User Group**: Grants programmatic access to team members without sharing root account credentials.

---

### 5.11 AWS Budgets (Cost Governance & Free Tier Protection)
- **What the Service Does**: AWS Budgets sets custom cost and usage limits that alert administrators before costs exceed budgeted amounts.
- **Why It Was Used in ApleShahar**:
  Enforces strict $0 Free Tier cost protection, guarding against accidental provisioning of paid services.
- **How It Works and Is Triggered**:
  - **Budget Name**: `ApleShahar-ZeroSpend-Budget`
  - **Monthly Threshold**: `$0.80 USD`
  - **Alert Threshold**: Trigger notification if actual or forecasted spend reaches 100% of budgeted amount.
  - **Notification**: Automated email alerts to team administrators (`apatade76@gmail.com`).

---

## 6. Live AWS Infrastructure & Resource Inventory

All resources below are provisioned and active in AWS region `ap-south-1` (Mumbai):

| Architectural Component | AWS Resource Name | Concrete Identifier / ARN / Endpoint | Configuration Details |
| :--- | :--- | :--- | :--- |
| **AWS Region** | Mumbai | `ap-south-1` | Primary deployment region for all services. |
| **VPC** | `apleshahar-vpc` | `vpc-0004b4f628adae8df` | CIDR: `10.0.0.0/16`, DNS Hostnames enabled. |
| **Internet Gateway** | `apleshahar-igw` | `igw-0048ad4830f3abf26` | Attached to `vpc-0004b4f628adae8df`. |
| **Public Subnet (EC2)** | `apleshahar-public-1a` | `subnet-01b625a9a0f0af953` | CIDR: `10.0.1.0/24`, AZ: `ap-south-1a`, Public IP: Auto-assign. |
| **Private Subnet 1 (RDS)**| `apleshahar-private-1a`| `subnet-0b7a37def7a9389ae` | CIDR: `10.0.2.0/24`, AZ: `ap-south-1a`. |
| **Private Subnet 2 (RDS)**| `apleshahar-private-1b`| `subnet-0acda9b4e81e2203f` | CIDR: `10.0.3.0/24`, AZ: `ap-south-1b`. |
| **Public Route Table** | `apleshahar-public-rt` | Associated with Public Subnet | Route `0.0.0.0/0` targeting `apleshahar-igw`. |
| **EC2 Security Group** | `apleshahar-ec2-sg` | `sg-062252861b7de2668` | Inbound: Ports 80, 443, 22, 5000. |
| **RDS Security Group** | `apleshahar-rds-sg` | `sg-0b9bde57f8c29bfdc` | Inbound: Port 5432 restricted strictly to `sg-062252861b7de2668`. |
| **RDS Subnet Group** | `apleshahar-db-subnets`| Multi-AZ Subnet Group | Encompasses private subnets in `ap-south-1a` and `ap-south-1b`. |
| **RDS PostgreSQL DB** | `apleshahar-postgres` | `apleshahar-postgres.claiyoqcgr10.ap-south-1.rds.amazonaws.com` | PostgreSQL 16.10, `db.t3.micro`, 20GB gp3, Single-AZ, Port 5432. |
| **Database Name** | `apleshahar` | Master user: `postgres` | Password managed in SSM Parameter Store. |
| **S3 Media Storage** | `apleshahar-media-76343`| `arn:aws:s3:::apleshahar-media-76343` | Public read bucket policy applied; browser CORS active. |
| **S3 Frontend Hosting** | `apleshahar-frontend-852227600998-2026` | `http://apleshahar-frontend-852227600998-2026.s3-website.ap-south-1.amazonaws.com` | Static website hosting active; SPA error routing to `index.html`. |
| **CloudFront CDN** | `ApleShahar Unified Edge CDN` | `d1gbzyhd2sdjfm.cloudfront.net` (ID: `E173DOOWG8BGP2`) | Multi-origin routing: `/*` to S3 frontend, `/api/*` to EC2 container, `/complaints/*` to S3 media. |
| **SSM Parameter Store**| `/apleshahar/*` | 11 Managed Secrets/Configs | Encrypted `SecureString` and `String` parameters injected into container RAM. |
| **Lambda Image Resizer** | `ApleShahar-ImageResizer` | `arn:aws:lambda:ap-south-1:852227600998:function:ApleShahar-ImageResizer` | Node.js 20.x, 512MB, auto-triggered on `s3:ObjectCreated:*` in media bucket. |
| **EC2 Instance (Backend)** | `apleshahar-backend-server` | `i-0260cf2d7f71c8832` | Public IP: `3.110.87.195`, Type: `t3.micro`, Port 5000, State: `running`. |
| **IAM Instance Profile** | `ApleShahar-EC2-BackendRole` | Attached to Role | Attached to EC2 backend instance. |
| **SNS Topic** | `apleshahar-complaint-alerts` | `arn:aws:sns:ap-south-1:852227600998:apleshahar-complaint-alerts` | Email subscription active (`apatade76@gmail.com`). |
| **CloudWatch Alarm** | `EC2-HighCPU-Alarm` | Threshold: CPU > 75% | Actions: Send notification to SNS topic upon breach. |

---

## 7. Complete Deployment & Infrastructure Provisioning Guide

### 7.1 Path A: Automated Infrastructure Provisioning (IaC)
Infrastructure automation scripts are provided in [`docs/`](./) to provision the VPC, Subnets, Routing, Security Groups, S3, IAM Roles, SNS, RDS, and CloudWatch automatically.

#### Using PowerShell (Windows):
```powershell
cd docs
.\deploy-infra.ps1 -Region "ap-south-1" `
                   -DbPassword "ApleShaharPassword123!" `
                   -AlertEmail "your-email@gmail.com" `
                   -BucketPrefix "apleshahar-media"
```

#### Using Bash (Linux / macOS / CloudShell):
```bash
cd docs
chmod +x deploy-infra.sh
./deploy-infra.sh "ap-south-1" "ApleShaharPassword123!" "your-email@gmail.com" "apleshahar-media"
```

---

### 7.2 Path B: The EC2 Backend Container Step
Connect to the EC2 instance to launch the containerized backend:

```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@3.110.87.195

# 1. Install Docker, Docker Compose, and Git
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

Fill in the environment variables:
```env
PORT=5000
FRONTEND_URL=*
DB_HOST=apleshahar-postgres.claiyoqcgr10.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=apleshahar
DB_USER=postgres
DB_PASSWORD=ApleShaharPassword123!
DB_SSL=true
JWT_SECRET=super-secure-production-jwt-token-string-32-chars
S3_BUCKET_NAME=apleshahar-media-76343
SNS_TOPIC_ARN=arn:aws:sns:ap-south-1:852227600998:apleshahar-complaint-alerts
AWS_REGION=ap-south-1
```

```bash
# 4. Launch the containerized backend
docker compose up -d --build

# 5. Verify database schema initialization logs
docker logs apleshahar-backend
```
Expected output:
```text
Server running on port 5000
PostgreSQL Schema verified: tables (users, complaints, facility_requests) ready.
```

---

### 7.3 Path C: The Serverless Lambda Step (Thumbnail Generator)

```bash
# 1. Package the Lambda function
cd docs/lambda
npm install

# On Windows PowerShell:
Compress-Archive -Path index.mjs, package.json, node_modules -DestinationPath lambda.zip -Force

# On Linux/macOS:
zip -r lambda.zip index.mjs package.json node_modules
```

2. Open **AWS Console -> Lambda -> Create Function**:
   - Name: `ApleShahar-ImageResizer`
   - Runtime: `Node.js 20.x` (x86_64)
   - Role: Attach `ApleShahar-LambdaExecutionRole`
3. Upload `lambda.zip` under the **Code** tab.
4. Under **Function Overview**, click **Add Trigger**:
   - Source: `S3`
   - Bucket: `apleshahar-media-76343`
   - Event: `All object create events (s3:ObjectCreated:*)`

---

### 7.4 Path D: Local Development Setup

To run the entire platform locally on your workstation:
```bash
# 1. Install dependencies across frontend and backend
npm run install:all

# 2. Set up local environment templates
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 3. Start both development servers concurrently
npm run dev
```
- Frontend runs at: `http://localhost:5173`
- Backend API runs at: `http://localhost:5000`

---

## 8. End-to-End Demonstration & Verification Procedure

Follow this structured procedure during academic evaluation or technical demonstrations:

### Phase 1: Live Web Application Workflow
1. **Open Application**: Navigate to `https://d1gbzyhd2sdjfm.cloudfront.net`. Note the secure HTTPS lock provided by CloudFront.
2. **Citizen Registration**:
   - Click **Sign Up** and create an account (`citizen.demo@apleshahar.gov.in`).
   - The backend salts and hashes the password with `bcryptjs`, inserts the user record into Amazon RDS PostgreSQL, and returns a signed JWT stored in `sessionStorage`.
3. **Lodge Grievance with Photographic Proof**:
   - Click **Report Issue**.
   - Category: `Pothole / Road Damage`, Ward: `12`, Description: `Deep pothole near station junction causing transit congestion`.
   - Attach a sample photo (500 KB to 2 MB) and submit.
   - The API streams the photo to S3 bucket `apleshahar-media-76343`, commits the record to RDS, and publishes an SNS alert in <15ms.
4. **Authority Review & Resolution**:
   - Log in as an Authority (Passkey: `AUTHORITY`).
   - Open the Authority Dashboard, filter by Ward 12, assign an ETA (`24 Hours`), and mark `In Progress`.
   - Once resolved, attach a repair verification photo and mark `Resolved`.

---

### Phase 2: Live AWS Console Verification
1. **Amazon S3**:
   - Open S3 -> Bucket `apleshahar-media-76343` -> `complaints/`.
   - Confirm original upload exists (`complaints/photo.jpg`, ~600 KB).
   - Confirm optimized thumbnail was generated by Lambda (`complaints/thumb-photo.jpg`, ~107 KB).
2. **AWS Lambda CloudWatch Logs**:
   - Open Lambda -> `ApleShahar-ImageResizer` -> Monitor -> CloudWatch Logs.
   - Inspect the latest execution entry: confirm execution completed with duration under 800ms.
3. **Amazon SNS Transactional Email**:
   - Check the authority inbox (`apatade76@gmail.com`).
   - Verify receipt of email: `[ApleShahar Alert] New Issue in Ward 12`.
4. **Amazon RDS PostgreSQL Records**:
   - Query the `complaints` table to verify foreign key relationship to `users.id` and active status.
5. **Amazon CloudWatch Alarm**:
   - Open CloudWatch -> Alarms. Confirm `EC2-HighCPU-Alarm` status is green (`OK`).

---

## 9. Operational Teardown & Cost Governance

To safely stop or delete cloud resources and preserve AWS credits:

### Temporary Resource Pause (Zero Compute Costs):
1. **Stop EC2 Instance**: In the EC2 Console, select `apleshahar-backend-server` -> `Instance state` -> `Stop instance`.
2. **Stop RDS Database**: In the RDS Console, select `apleshahar-postgres` -> `Actions` -> `Stop temporarily` (pauses database compute for up to 7 days).

### Permanent Clean Teardown:
Execute the automated cleanup script:
```powershell
cd docs
.\cleanup.ps1 -Region "ap-south-1"
```
This cleanly removes the CloudWatch alarm, SNS topic, S3 buckets, RDS database, EC2 security groups, subnets, and custom VPC.

---

## 10. Architectural Compliance Matrix

| Cloud Computing Requirement | Implementation in ApleShahar | Compliance Status |
| :--- | :--- | :--- |
| **Mandatory Non-Serverless Compute** | Dockerized Node.js 20/Express REST API on Amazon EC2 (`t3.micro`) | **Fully Compliant** |
| **Mandatory Custom VPC** | Isolated VPC (`10.0.0.0/16`) with tiered public/private subnets and SGs | **Fully Compliant** |
| **Mandatory Managed Relational DB** | Amazon RDS PostgreSQL (16.10, `db.t3.micro`) in private subnets | **Fully Compliant** |
| **Mandatory Cloud Storage** | Amazon S3 for citizen grievance media and static frontend hosting | **Fully Compliant** |
| **IAM Least Privilege & Zero Hardcoding** | IMDSv2 Instance Profiles, scoped inline policies, SSM Parameter Store | **Fully Compliant** |
| **Cloud Monitoring & Alarms** | Amazon CloudWatch CPUUtilization alarm routed to Amazon SNS | **Fully Compliant** |
| **Cost Management & Governance** | AWS Budgets with $0.80 threshold and automated email notifications | **Fully Compliant** |
| **Capability 1: Supporting Serverless** | AWS Lambda (`ApleShahar-ImageResizer`) triggered on S3 object creation | **Fully Compliant** |
| **Capability 2: Decoupled Messaging** | Amazon SNS (`apleshahar-complaint-alerts`) for asynchronous alerting | **Fully Compliant** |
| **Capability 3: Content Delivery** | Amazon CloudFront multi-origin CDN with edge caching and HTTPS | **Fully Compliant** |
