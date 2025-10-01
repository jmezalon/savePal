# SavePal - Sousou Management Platform

A modern digital platform for creating and managing sousou (ROSCA - Rotating Savings and Credit Association) groups.

## 🎯 Project Overview

SavePal allows users to:
- Create and manage sousou/savings groups
- Make automated contributions
- Track payment cycles and payouts
- Invite and manage group members
- Receive notifications for upcoming payments

## 🏗️ Architecture

This is a **monorepo** project with the following structure:

```
savepal/
├── packages/
│   ├── frontend/     # React + TypeScript + Vite + TailwindCSS
│   ├── backend/      # Node.js + Express + TypeScript
│   └── shared/       # Shared types and utilities
└── package.json      # Workspace root
```

## 🛠️ Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router
- Context API

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis + Bull (job queue)
- JWT Authentication

### Services
- Stripe (payments)
- Twilio (SMS)
- SendGrid (email)
- Supabase (database hosting)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jmezalon/savePal.git
cd savePal
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Backend
cp packages/backend/.env.example packages/backend/.env

# Frontend
cp packages/frontend/.env.example packages/frontend/.env
```

4. Run database migrations:
```bash
cd packages/backend
npx prisma migrate dev
```

5. Start development servers:
```bash
# From root directory
npm run dev
```

## 📋 Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches

### Creating a Feature

1. Create a feature branch from `develop`:
```bash
git checkout develop
git checkout -b feature/your-feature-name
```

2. Make your changes and commit:
```bash
git add .
git commit -m "feat: your feature description"
```

3. Push and create a PR:
```bash
git push origin feature/your-feature-name
```

## 📦 Available Scripts

### Root
- `npm run dev` - Start all dev servers
- `npm run build` - Build all packages
- `npm run test` - Run all tests

### Frontend (packages/frontend)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend (packages/backend)
- `npm run dev` - Start Express server with hot reload
- `npm run build` - Compile TypeScript
- `npm run start` - Start production server

## 🗓️ Development Roadmap

### Phase 1: Foundation (Week 1) ✓
- [x] Project setup
- [x] Monorepo structure
- [x] Git workflow
- [ ] Backend scaffolding
- [ ] Database schema

### Phase 2-3: Core Backend (Weeks 2-3)
- [ ] Auth system (JWT)
- [ ] User management
- [ ] Group CRUD operations
- [ ] Membership system
- [ ] Cycle management

### Phase 4-5: Payment Integration (Weeks 4-5)
- [ ] Stripe integration
- [ ] Payment processing
- [ ] Payout logic
- [ ] Fee calculation
- [ ] Escrow management

### Phase 6-7: Frontend MVP (Weeks 6-7)
- [ ] Authentication pages
- [ ] Dashboard
- [ ] Group management UI
- [ ] Payment forms
- [ ] Responsive design

### Phase 8: Notifications (Week 8)
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Push notifications
- [ ] Scheduler setup

### Phase 9-10: Testing (Weeks 9-10)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Security audit
- [ ] Bug fixes

### Phase 11: Deployment (Week 11)
- [ ] Vercel deployment (frontend)
- [ ] Railway/Render (backend)
- [ ] Database setup
- [ ] Production monitoring

## 📄 License

ISC

## 👥 Contributors

- Your Name

## ⚠️ Legal Notice

This application handles financial transactions. Ensure compliance with:
- Money Transmission Licenses
- KYC/AML regulations
- Data privacy laws (GDPR, CCPA)

Consult legal counsel before launching to production.
