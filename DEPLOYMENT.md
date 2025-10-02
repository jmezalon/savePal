# SavePal Deployment Guide

This guide will help you deploy SavePal to production using free-tier services.

## Architecture
- **Frontend**: Vercel (React + Vite)
- **Backend**: Render or Railway (Node.js + Express)
- **Database**: Supabase (PostgreSQL)

## Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com)
- Render account (sign up at render.com) OR Railway account
- Supabase project already set up

---

## 1. Deploy Backend to Render

### Option A: Using Render Dashboard

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your GitHub account
   - Select the `savePal` repository
   - Click "Connect"

3. **Configure Service**
   - **Name**: `savepal-backend`
   - **Region**: Choose closest to you
   - **Branch**: `main` or `develop`
   - **Root Directory**: Leave empty (or `.`)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     cd packages/backend && npm install && npx prisma generate && npm run build
     ```
   - **Start Command**:
     ```bash
     cd packages/backend && npm start
     ```
   - **Plan**: Free

4. **Add Environment Variables**
   Click "Advanced" → "Add Environment Variable":

   ```
   NODE_ENV=production
   DATABASE_URL=<your-supabase-connection-string>
   JWT_SECRET=<generate-random-secret>
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_KEY=<your-supabase-anon-key>
   PORT=3000
   ```

   **To generate JWT_SECRET**, run in terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (takes 2-5 minutes)
   - Copy your backend URL: `https://savepal-backend.onrender.com`

### Option B: Using render.yaml (Infrastructure as Code)

1. Push the `render.yaml` file to your repo
2. In Render dashboard: "New +" → "Blueprint"
3. Select your repo
4. Render will auto-detect the configuration
5. Add environment variables manually in dashboard

---

## 2. Deploy Frontend to Vercel

### Step 1: Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### Step 2: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Repository**
   - Click "Import Git Repository"
   - Select your `savePal` repository
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `packages/frontend` (Click "Edit" next to it)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Add Environment Variables**
   Click "Environment Variables":

   ```
   VITE_API_BASE_URL=<your-render-backend-url>
   ```

   Example:
   ```
   VITE_API_BASE_URL=https://savepal-backend.onrender.com
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build (takes 1-3 minutes)
   - Your app will be live at: `https://savepal-xyz.vercel.app`

### Step 3: Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for DNS propagation (5-60 minutes)

---

## 3. Update Backend CORS

After deploying frontend, update your backend CORS configuration:

1. Go to your backend code: `packages/backend/src/index.ts`
2. Update CORS origins to include your Vercel domain:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://savepal-xyz.vercel.app',  // Add your Vercel domain
    'https://your-custom-domain.com'   // Add custom domain if any
  ],
  credentials: true
}));
```

3. Commit and push to trigger redeployment on Render

---

## 4. Database Setup (Supabase)

Your Supabase database should already be configured. Ensure:

1. **Connection String**: Already in `DATABASE_URL`
2. **Tables**: Run Prisma migrations
   ```bash
   npm run db:push
   ```
3. **Row Level Security (RLS)**: Currently disabled for development
   - For production, consider enabling RLS policies

---

## 5. Post-Deployment Checklist

### Backend Health Check
- [ ] Visit `https://your-backend.onrender.com/health` (if you have a health endpoint)
- [ ] Check backend logs in Render dashboard
- [ ] Test API endpoints with curl or Postman

### Frontend Testing
- [ ] Visit your Vercel URL
- [ ] Test user registration
- [ ] Test user login
- [ ] Test group creation
- [ ] Test group joining

### Environment Variables Validation
- [ ] Backend has all required env vars
- [ ] Frontend `VITE_API_BASE_URL` points to correct backend
- [ ] CORS origins include frontend domain
- [ ] JWT_SECRET is secure and random

---

## 6. Monitoring & Maintenance

### Render (Backend)
- Free tier sleeps after 15 min of inactivity
- First request after sleep takes ~30 seconds
- Upgrade to paid tier ($7/month) for always-on service
- View logs: Dashboard → Your Service → Logs

### Vercel (Frontend)
- Always on, no cold starts
- 100GB bandwidth on free tier
- View logs: Project → Deployments → Click deployment → Logs

### Database (Supabase)
- Free tier: 500MB database
- Monitor usage in Supabase dashboard
- Set up database backups in production

---

## 7. Continuous Deployment

Both Vercel and Render support automatic deployments:

- **Main/Develop Branch**: Pushes to `main` or `develop` trigger production deployment
- **Feature Branches**: Create preview deployments automatically
- **Pull Requests**: Generate preview URLs for testing

---

## 8. Troubleshooting

### Backend Won't Start
1. Check build logs in Render
2. Verify all environment variables are set
3. Check `DATABASE_URL` is correct
4. Ensure Prisma client is generated: `npx prisma generate`

### Frontend API Calls Failing
1. Check browser console for CORS errors
2. Verify `VITE_API_BASE_URL` in Vercel env vars
3. Confirm backend CORS allows your frontend domain
4. Check backend is running (not sleeping)

### Database Connection Issues
1. Verify `DATABASE_URL` format: `postgresql://user:pass@host:5432/db?schema=public`
2. Check Supabase connection pooler URL if using pooling
3. Ensure IP whitelist includes Render IPs (if enabled in Supabase)

### Build Failures
1. Clear build cache in Vercel/Render
2. Check Node.js version compatibility
3. Verify all dependencies are in package.json
4. Check for TypeScript errors

---

## 9. Alternative Deployment Options

### Backend Alternatives
- **Railway**: Similar to Render, $5/month starter
- **Fly.io**: Free tier available, Docker-based
- **Heroku**: Paid plans only now
- **DigitalOcean App Platform**: $5/month minimum

### Frontend Alternatives
- **Netlify**: Similar to Vercel
- **Cloudflare Pages**: Free with good performance
- **GitHub Pages**: Static only, needs workarounds for SPA routing

---

## 10. Production Optimization Checklist

- [ ] Enable HTTPS (automatic on Vercel/Render)
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Add analytics (Google Analytics, Plausible)
- [ ] Configure rate limiting on backend
- [ ] Set up automated database backups
- [ ] Enable database connection pooling
- [ ] Add health check endpoints
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure CDN for static assets
- [ ] Implement proper logging (Winston, Pino)

---

## Quick Deploy Commands

```bash
# 1. Merge landing page to main
git checkout develop
git merge feature/landing-page
git push origin develop

# 2. Deploy Backend (if using CLI)
cd packages/backend
# Configure on Render dashboard

# 3. Deploy Frontend (if using Vercel CLI)
cd packages/frontend
vercel --prod

# 4. Verify deployment
curl https://your-backend.onrender.com/api/auth/health
open https://your-frontend.vercel.app
```

---

## Support & Documentation

- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- Supabase Docs: https://supabase.com/docs
- Prisma Docs: https://www.prisma.io/docs

---

**Your app will be live at:**
- Frontend: `https://savepal-xyz.vercel.app`
- Backend: `https://savepal-backend.onrender.com`
