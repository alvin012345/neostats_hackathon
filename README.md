# NeoStats - Collaborative Project Management Platform

A high-performance, full-stack collaborative project management platform built for the **NeoStats Full Stack Engineering Hackathon**. Features bi-directional real-time collaboration with **Socket.IO**, strict server-side **Role-Based Access Control (RBAC)** across four user roles, and **Optimistic Concurrency Control (OCC)** detecting and resolving concurrent editing collisions with **HTTP 409 Conflict**.

> 🎓 **Evaluator & Viva Reference**: Read [**`VIVA_DEFENSE.md`**](./VIVA_DEFENSE.md) for architectural trade-off justifications, step-by-step live coding walkthroughs, terminal attack simulations, and Section 12 AI usage disclosure. See also [**`EXPLANATION.md`**](./EXPLANATION.md).

---

## Table of Contents
0. [Viva Defense & Evaluator Guide (`VIVA_DEFENSE.md`)](./VIVA_DEFENSE.md)
1. [Architecture & Design Highlights](#architecture--design-highlights)
2. [Seed Login Credentials](#seed-login-credentials)
3. [Technology Stack](#technology-stack)
4. [Prerequisites & System Requirements](#prerequisites--system-requirements)
5. [Environment Variables](#environment-variables)
6. [Quick Start Setup Guide](#quick-start-setup-guide)
7. [Automated Verification & Tests](#automated-verification--tests)
8. [Manual Multi-Browser Real-Time Test Procedure](#manual-multi-browser-real-time-test-procedure)
9. [Key Architectural Mechanisms](#key-architectural-mechanisms)
   - [Real-Time Collaboration Engine](#1-real-time-collaboration-engine)
   - [Optimistic Concurrency Control (OCC)](#2-optimistic-concurrency-control-occ)
   - [Server-Side RBAC Enforcement](#3-server-side-rbac-enforcement)
10. [Repository Structure](#repository-structure)

---

## Architecture & Design Highlights

```
+-----------------------------------------------------------------------------------------+
|                                    SYSTEM TOPOLOGY                                      |
+-----------------------------------------------------------------------------------------+
    CLIENT WORKSTATION 1 (PM)                     CLIENT WORKSTATION 2 (TEAM MEMBER)
  +----------------------------+                +------------------------------------+
  |    Next.js 16 (Port 3000)  |                |        Next.js 16 (Port 3000)      |
  +--------------+-------------+                +------------------+-----------------+
                 |                                                 |
       HTTP/REST | WebSocket (Socket.IO)                 HTTP/REST | WebSocket (Socket.IO)
         (JWT)   |                                         (JWT)   |
                 v                                                 v
  +---------------------------------------------------------------------------------------+
  |                           EXPRESS.JS BACKEND (Port 5000)                              |
  |                                                                                       |
  |  • Auth & Active User Middleware (Checked on every request)                           |
  |  • Server RBAC Guards (Admin, PM, Member, Viewer policies)                            |
  |  • Atomic OCC Engine (updateMany where id & version -> HTTP 409 on collision)         |
  |  • Socket.IO Gateway (Authenticated rooms: project:<id> & user:<id>)                  |
  |  • Post-Commit Event Broadcaster (Zero dirty-read event leaks)                        |
  +-------------------------------------------+-------------------------------------------+
                                              |
                                      Prisma ORM Client
                                              |
                                              v
  +---------------------------------------------------------------------------------------+
  |                               POSTGRESQL 18 (Port 5432)                               |
  |                     neostats_db with 7 Relational Tables & Cascades                   |
  +---------------------------------------------------------------------------------------+
```

---

## Seed Login Credentials

The database comes pre-seeded with accounts across all **4 required roles** (Password for all accounts is `password123`):

| Role | Email Address | Password | Permissions & Scope |
|---|---|---|---|
| **Admin** | `admin@neostats.com` | `password123` | Global system control, user management (create, deactivate), project creation/deletion, system audit. |
| **Project Manager** | `pm@neostats.com` | `password123` | Scoped to assigned projects. Manages team members, creates/deletes/assigns tasks, changes task statuses. |
| **Team Member** | `member@neostats.com` | `password123` | Scoped to project memberships. Updates assigned tasks, advances assigned task status, posts comments. |
| **Viewer** | `viewer@neostats.com` | `password123` | Read-only access across projects, Kanban boards, comments, and audit logs. All mutations rejected with 403. |

> 💡 **Quick Demo Feature**: The login screen (`/login`) includes **1-click login buttons** for all 4 roles. A **"Switch Role"** dropdown is also accessible directly from the top navigation bar during live demonstrations.

---

## Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Socket.io-client.
- **Backend**: Node.js, Express.js, TypeScript, Socket.IO v4, Zod validation, JWT (`jsonwebtoken`), bcryptjs.
- **Database & ORM**: PostgreSQL 18, Prisma ORM 6 with automated migrations.

---

## Prerequisites & System Requirements

- **Node.js**: v22+ (tested and verified on v24.11)
- **PostgreSQL**: v14+ (tested and verified on local PostgreSQL 18.6)
- **Package Manager**: npm v11+

---

## Environment Variables

### Backend Configuration (`backend/.env`)
```env
PORT=5000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/neostats_db?schema=public"
JWT_SECRET="supersecret_jwt_key_neostats_hackathon_2026"
CLIENT_ORIGIN="http://localhost:3000"
```
*(Note: If your database password contains special characters like `@`, URL-encode them, e.g. `%40`)*.

### Frontend Configuration (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_WS_URL="http://localhost:5000"
```

---

## Quick Start Setup Guide

### 1. Clone the repository and install dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### 2. Run Database Migrations & Seed Sample Data
```bash
cd backend
# Generate Prisma client
npm run prisma:generate

# Apply migrations (automatically creates database neostats_db if needed)
npm run prisma:migrate

# Seed the 4 user accounts, sample projects, tasks, comments, and activity logs
npm run prisma:seed
cd ..
```

### 3. Start Both Backend & Frontend Development Servers
Open two terminal windows:

**Terminal 1 (Backend API & Real-Time Gateway):**
```bash
cd backend
npm run dev
# Server starts on http://localhost:5000
# Health check available at http://localhost:5000/api/health
```

**Terminal 2 (Frontend Web Application):**
```bash
cd frontend
npm run dev
# Next.js starts on http://localhost:3000
```

Navigate to **`http://localhost:3000`** in your browser.

---

## Automated Verification & Tests

The project includes automated integration test suites covering the two core priorities named in the hackathon brief (RBAC permissions and concurrency conflicts):

```bash
# Run both test suites from the root directory
npm test
```

### 1. RBAC & Authorization Suite (`backend/src/tests/verify_rbac.ts`)
- Verifies authentication and JWT issuance across all 4 roles.
- Verifies that Team Members attempting `DELETE /api/tasks/:id` are rejected with **`403 Forbidden`**.
- Verifies that Viewers attempting status updates or comments are rejected with **`403 Forbidden`**.
- Verifies that non-admins attempting `/api/users` or `POST /api/projects` are rejected with **`403 Forbidden`**.
- Verifies Optimistic Concurrency Control (OCC) detecting stale version updates with **`409 Conflict`**.
- Verifies User Deactivation: Administrators can deactivate/reactivate accounts; deactivated users receive **`403 Forbidden: Account deactivated`** on login and all API requests.
- Verifies Project Archiving Write-Lock: Admins & PMs can set project status to `ARCHIVED`; all task creations, mutations, deletions, and comments are blocked with **`403 Forbidden: PROJECT_ARCHIVED`**.
- Verifies Comment Deletion: Authors can delete their own comments, and PMs/Admins can delete any comments on their projects.
- Verifies Team Member Reassignment Lock: Team Members cannot edit tasks assigned to others or reassign tasks (`403 Forbidden`).
- Verifies Member Removal RBAC: Non-PMs/non-Admins cannot remove project members (`403 Forbidden`).
- Verifies Last Admin Protection: System blocks deactivating or deleting the sole active Admin (`400 Bad Request`).
- Verifies 404 Resilience: Non-existent or malformed UUIDs return clean `404 Not Found` without 500 server crashes.
- Verifies Whitespace Validation: Whitespace-only titles, names, and comments are rejected with `400 Bad Request`.
- **Result**: **42 PASSED, 0 FAILED**.

### 2. Real-Time Socket.IO Suite (`backend/src/tests/verify_realtime.ts`)
- Spawns two simulated WebSocket clients (Project Manager & Team Member).
- Verifies JWT handshake authentication and project room scoping (`project:<id>`).
- Validates that REST API mutations on Client 1 trigger instant WebSocket events on Client 2 (`task:created`, `task:status_changed`, `comment:created`, and private `notification:new`).
- Validates real-time notifications on assignee status changes and comment `@mentions`.
- Validates real-time broadcasts for `activity:created` and `comment:deleted`.
- **Result**: **15 PASSED, 0 FAILED**.
- **Total Combined**: **57 PASSED, 0 FAILED**.

---

## Manual Multi-Browser Real-Time Test Procedure

To verify live collaboration and optimistic concurrency control across two connected sessions:

1. **Step 1**: Open **Browser Window 1** (e.g. Chrome) at `http://localhost:3000` and click **"Project Manager"** (or log in with `pm@neostats.com`).
2. **Step 2**: Open **Browser Window 2** in **Incognito Mode** at `http://localhost:3000` and click **"Team Member"** (or log in with `member@neostats.com`).
3. **Step 3**: In both windows, click into **"E-Commerce Platform Modernization"** to view the Kanban board.
4. **Step 4 (Real-Time Card Creation)**:
   - In Window 1 (PM), click **"New Task"**, title it `"Deploy Ingress Controller"`, and submit.
   - **Verification**: The card instantly appears in Window 2's `TODO` column without a page refresh!
5. **Step 5 (Real-Time Status Advancement)**:
   - In Window 2 (Member), click **"Advance"** on the task card to move it to `IN_PROGRESS`.
   - **Verification**: Window 1's board updates immediately, moving the card to `IN_PROGRESS` in real time.
6. **Step 6 (Simultaneous Edit & OCC 409 Conflict)**:
   - In Window 1, click on the task card to open the edit modal (reads version 1).
   - In Window 2, click on the same task card to open the edit modal (reads version 1).
   - In Window 1, change the title to `"Deploy Ingress Controller v1.5"` and click **Save Changes** (Succeeds, moves database record to version 2).
   - In Window 2, without closing the modal, change the title to `"Deploy Ingress Controller v2.0"` and click **Save Changes**.
   - **Verification**: Window 2 intercepts the `HTTP 409 Conflict` and triggers the **Concurrency Conflict Resolution Modal**, displaying:
     - *Server State*: `Deploy Ingress Controller v1.5` (v2)
     - *Your Attempted Changes*: `Deploy Ingress Controller v2.0` (Stale)
     - Click **"Reload Latest State"** to safely sync with the remote change, or **"Force Overwrite"** to push your revision.

---

## Key Architectural Mechanisms

### 1. Real-Time Collaboration Engine
- **Technology**: Socket.IO v4 over WebSockets with polling fallback.
- **Connection Handshake**: Validates JWT signature and confirms `user.isActive === true` from PostgreSQL before accepting the socket.
- **Channel Scoping**:
  - `project:<id>`: Joined via `project:join` event. Server validates project membership before granting entry, preventing cross-project data leakage.
  - `user:<id>`: Private room joined automatically on connection for targeted personal notifications.
- **Post-Commit Broadcast**: All socket events are emitted strictly *after* database transactions commit (`prisma.$transaction`), guaranteeing clients never see rolled-back states.
- **Live Room Eviction**: Removing a member or deactivating an account executes `io.in("user:" + id).socketsLeave("project:" + id)` to instantly cut their live feed.

### 2. Optimistic Concurrency Control (OCC)
- Every task includes an integer `version` field starting at `1`.
- Update endpoints accept `expectedVersion`.
- Updates execute an atomic conditional query:
  ```typescript
  const result = await prisma.task.updateMany({
    where: { id: taskId, version: expectedVersion },
    data: { ...updateData, version: { increment: 1 } },
  });
  if (result.count === 0) {
    // Collision detected! Fetch latest state and return 409
    const currentTask = await prisma.task.findUnique({ where: { id: taskId } });
    return res.status(409).json({ error: "CONCURRENCY_CONFLICT", currentTask });
  }
  ```

### 3. Server-Side RBAC Enforcement
- Authorization is strictly enforced in Express middleware (`authenticate`, `requireSystemRole`, `requireProjectRole`), not by merely hiding UI buttons.
- Direct API calls via Postman or curl from unauthorized roles are intercepted and rejected with `HTTP 403 Forbidden`.
- Every authenticated request verifies `user.isActive` against PostgreSQL, providing instant access revocation for deactivated users.

---

## Repository Structure

```
neostats_hackathon/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # 7 relational models, indexes, cascades, OCC version
│   │   ├── seed.ts                  # Seed script for 4 roles, demo projects, tasks
│   │   └── migrations/              # Version-controlled SQL migrations
│   ├── src/
│   │   ├── config/                  # Prisma client singleton
│   │   ├── controllers/             # Auth, User, Project, Task, Comment, Notification controllers
│   │   ├── middleware/              # authenticate, server RBAC guards, Zod validation
│   │   ├── routes/                  # Express REST route registries
│   │   ├── services/                # socketService event broadcaster & activity logger
│   │   ├── sockets/                 # Socket.IO gateway with handshake auth & room managers
│   │   ├── tests/                   # Automated RBAC (403/409) and Real-time test suites
│   │   ├── types/                   # Express request augmentations
│   │   ├── utils/                   # JWT signing and verification
│   │   ├── app.ts                   # Express application factory & middleware stack
│   │   └── server.ts                # HTTP + Socket.IO server entrypoint
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/               # Split login screen with 1-click demo buttons
│   │   │   ├── dashboard/           # Metrics, active project cards, quick actions
│   │   │   ├── projects/            # Project directory & Admin creation modal
│   │   │   ├── projects/[id]/       # Dedicated Project Overview page
│   │   │   │   ├── tasks/           # Dedicated Kanban Task Board page
│   │   │   │   ├── team/            # Dedicated Project Team & Roles page
│   │   │   │   └── activity/        # Dedicated Project Audit Trail page
│   │   │   ├── tasks/[id]/          # Deep-linkable standalone task page
│   │   │   ├── notifications/       # Full-page notifications center
│   │   │   ├── users/               # Admin user management & soft-deactivation table
│   │   │   ├── profile/             # User identity & effective role permissions
│   │   │   ├── layout.tsx           # Global root layout with providers
│   │   │   └── globals.css          # Tailwind CSS styles
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Navigation bar with live socket status & role switcher
│   │   │   ├── KanbanBoard.tsx      # Interactive 4-column board with real-time sync
│   │   │   ├── TaskModal.tsx        # Task editing modal with live comments & OCC
│   │   │   ├── ConflictModal.tsx    # HTTP 409 side-by-side conflict resolution modal
│   │   │   ├── NotificationsDropdown.tsx # In-app notification center
│   │   │   └── Toast.tsx            # Slide-in real-time toast alert banner
│   │   ├── context/
│   │   │   ├── AuthContext.tsx      # User state, JWT storage, quick demo login
│   │   │   └── SocketContext.tsx    # Socket.IO connection, room join/leave, notifications
│   │   ├── lib/
│   │   │   └── api.ts               # Authenticated API client wrapper
│   │   └── types/                   # Frontend TypeScript interfaces
│   ├── package.json
│   └── next.config.ts
├── EXPLANATION.md                   # Comprehensive evaluator reference & viva guide
├── Work.md                          # Phase-by-phase execution tracker & terminal log
└── README.md                        # Project documentation & setup instructions
```
