# ApleShahar Monorepo / Multi-Repo Workspace

This workspace coordinates both repositories for the **ApleShahar** application:
- **Frontend**: [ApleShahar](https://github.com/dmelloarlen/ApleShahar.git) (Vite + React + Tailwind CSS)
- **Backend**: [ApleShaharBackend](https://github.com/dmelloarlen/ApleShaharBackend.git) (Node.js + Express + Supabase)

---

## 📁 Directory Structure

```text
cclmp/
├── frontend/             # React + Vite client application (Port 5173)
│   ├── src/
│   ├── .env.example
│   └── package.json
├── backend/              # Node.js + Express API server (Port 5000)
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── .env.example
│   └── package.json
├── aws_mig_plan/         # AWS Migration plan & architecture documents
├── .vscode/              # Editor tasks and debugging configurations
├── package.json          # Root orchestration scripts
└── README.md             # Workspace documentation
```

---

## 🚀 Quick Start

### 1. Install All Dependencies

All dependencies have already been installed for you. If needed in the future, run:

```bash
npm run install:all
```

Or install inside each folder individually:
```bash
cd frontend && npm install
cd ../backend && npm install
```

---

### 2. Configure Environment Variables

Create `.env` files in both directories based on the provided examples:

#### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000
```

#### Backend (`backend/.env`)
```env
PORT=5000
FRONTEND_URL=http://localhost:5173

# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authority Access
AUTHORITY_SECURITY_CODE=AUTHORITY
```

---

### 3. Run Development Servers

From the root directory, you can start both frontend and backend concurrently:

```bash
npm run dev
```

Or run them individually:

```bash
# Frontend only (http://localhost:5173)
npm run dev:frontend

# Backend only (http://localhost:5000)
npm run dev:backend
```

---

### 4. Git Repositories

Each subfolder maintains its own independent Git repository pointing to its respective GitHub upstream:
- `frontend/`: `https://github.com/dmelloarlen/ApleShahar.git`
- `backend/`: `https://github.com/dmelloarlen/ApleShaharBackend.git`
