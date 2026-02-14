# Quick Action Checklist - Frontend-Backend Connection

**Goal**: Get the frontend connected to the backend with data loading properly  
**Audience**: Developers ready to execute  
**See also**: [FRONTEND_BACKEND_CONNECTION_TASKS.md](FRONTEND_BACKEND_CONNECTION_TASKS.md) for detailed task breakdown

---

## 🚀 Quick Start (Do This First)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# 3. Start everything
npm run dev

# 4. In another terminal, seed data
npm run seed

# 5. Open browser to http://localhost:5173
# You should see the dashboard with data
```

---

## ✅ Validation Checklist (In Order)

### Step 1: Backend Health Check (5 minutes)
- [ ] Server starts without errors (check terminal with `npm run dev`)
- [ ] Visit http://localhost:3001/api/health → should return `{"status":"ok"}`
- [ ] Firebase emulator is running (check for Firestore and Storage in logs)
- [ ] No error messages in server terminal

**Fix if needed**: Check `.env` file, ensure ports 3001, 8082, 9198 are available

---

### Step 2: Frontend Loads (5 minutes)
- [ ] Visit http://localhost:5173 → Dashboard page loads
- [ ] No errors in browser console (F12 → Console tab)
- [ ] Page shows "Loading..." or data (not blank)
- [ ] No network errors (F12 → Network tab, filter by "api")

**Fix if needed**: Check Vite is proxying `/api` to backend, verify `src/lib/api.ts` configuration

---

### Step 3: Dashboard Data Loads (5 minutes)
- [ ] KPIs show numbers (not "0" or blank)
- [ ] Activity feed shows items
- [ ] Profit summary shows data
- [ ] No error toasts appear
- [ ] Click on a KPI (e.g., "Total Inventory") → navigates correctly

**Fix if needed**: Run `npm run seed` again, check browser Network tab for failed API calls

---

### Step 4: Inventory Page Works (10 minutes)
- [ ] Navigate to Inventory (sidebar or URL /inventory)
- [ ] Product list shows items
- [ ] Click on a product → Detail drawer opens
- [ ] Drawer shows images, details, transactions
- [ ] Try editing a field → saves successfully
- [ ] Try searching → filters products
- [ ] Try sorting → reorders products

**Fix if needed**: Check console for errors, verify `/api/products` endpoint returns data

---

### Step 5: BuyBox/Evaluator Works (10 minutes)
- [ ] Navigate to Buy Box (sidebar or URL /buy-box)
- [ ] Form displays with dropdowns
- [ ] Select brand → models filter correctly
- [ ] Fill form and click "Analyse" → pricing analysis returns
- [ ] Results display recommended prices
- [ ] Click "Add to Buy List" → item added successfully

**Fix if needed**: Check `/api/pricing/analyse` endpoint, verify AI provider is set to "mock" in .env

---

### Step 6: Supplier Hub Works (10 minutes)
- [ ] Navigate to Supplier Hub
- [ ] Suppliers list shows items
- [ ] Supplier items feed shows items
- [ ] Try filtering by supplier → works
- [ ] Try filtering by brand → works
- [ ] Try searching → filters items
- [ ] Click "Add to Buy List" → item added

**Fix if needed**: Check `/api/suppliers` endpoints, ensure seed data loaded

---

### Step 7: Buying List Works (10 minutes)
- [ ] Navigate to Buying List
- [ ] Buy list items show
- [ ] Try switching to "Bulk Order" view → groups by supplier
- [ ] Click "Receive" on an item → modal opens
- [ ] Complete receive → product created in inventory
- [ ] Navigate to Inventory → new product exists
- [ ] Check Dashboard activity → receive event logged

**Fix if needed**: Check `/api/buying-list` endpoints, test receive flow step-by-step

---

### Step 8: Sourcing Works (10 minutes)
- [ ] Navigate to Sourcing
- [ ] Sourcing requests show
- [ ] Create new request → saves successfully
- [ ] Edit request → updates successfully
- [ ] Change status → validates transitions
- [ ] Delete request → removes successfully

**Fix if needed**: Check `/api/sourcing` endpoints, verify status validation

---

### Step 9: Jobs Page Works (5 minutes)
- [ ] Navigate to Jobs
- [ ] Jobs list shows (may be empty if no imports)
- [ ] If jobs exist, click "Retry" on a failed job → retries
- [ ] Job status updates

**Fix if needed**: Check `/api/jobs` endpoints, try importing CSV to create a job

---

### Step 10: Invoices Work (5 minutes)
- [ ] Navigate to Invoices
- [ ] Invoices list shows (may be empty)
- [ ] Try creating invoice from inventory sold product
- [ ] Invoice appears in list

**Fix if needed**: Check `/api/invoices` endpoints

---

## 🔧 Common Issues & Fixes

### Issue: "API returned HTML instead of JSON"
**Cause**: Frontend trying to hit backend, but backend not running or Vite proxy not configured  
**Fix**: 
1. Ensure backend is running on port 3001
2. Check `config/vite.config.ts` has proxy configured for `/api`
3. In production, set `VITE_API_BASE=https://your-backend-url.com/api`

### Issue: "CORS error"
**Cause**: Backend not allowing frontend origin  
**Fix**: Check `packages/server/src/server.ts` CORS configuration allows your frontend URL

### Issue: "Network request failed" or "Failed to fetch"
**Cause**: Backend not running, wrong port, or firewall blocking  
**Fix**: 
1. Check backend terminal for errors
2. Visit http://localhost:3001/api/health directly
3. Check firewall/antivirus settings

### Issue: Pages load but no data shows
**Cause**: Database is empty  
**Fix**: Run `npm run seed` in a terminal while dev server is running

### Issue: Firebase errors
**Cause**: Emulator not running or wrong configuration  
**Fix**: 
1. Check `.env` has `FIREBASE_USE_EMULATOR=true`
2. Check emulator logs in terminal (should see Firestore on port 8082)
3. Try stopping and restarting: Ctrl+C, then `npm run dev` again

### Issue: "Cannot find module" errors
**Cause**: Dependencies not installed or out of sync  
**Fix**: 
```bash
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules
npm install
```

### Issue: TypeScript errors in IDE
**Cause**: TypeScript server out of sync  
**Fix**: 
1. In VS Code: Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
2. Or run: `npx tsc --noEmit` to see all errors

---

## 🧪 Testing Each API Endpoint

Use curl or Postman to test endpoints directly:

```bash
# Health check
curl http://localhost:3001/api/health

# Get products
curl http://localhost:3001/api/products

# Get dashboard KPIs
curl http://localhost:3001/api/dashboard/kpis

# Get suppliers
curl http://localhost:3001/api/suppliers

# Get buying list
curl http://localhost:3001/api/buying-list

# Get sourcing requests
curl http://localhost:3001/api/sourcing

# Get jobs
curl http://localhost:3001/api/jobs

# Test pricing analysis
curl -X POST http://localhost:3001/api/pricing/analyse \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "Chanel",
    "model": "Classic Flap",
    "condition": "Excellent",
    "size": "Medium"
  }'
```

If any endpoint returns an error, check the backend terminal for detailed error logs.

---

## 📊 Success Criteria

You're done when:

- ✅ All pages load without errors
- ✅ All pages show data (after seeding)
- ✅ No console errors in browser
- ✅ No uncaught exceptions in backend
- ✅ Navigation between pages works
- ✅ CRUD operations work (create, read, update, delete)
- ✅ Critical flows work end-to-end:
  - Evaluator → Add to Buy List → Receive → Inventory
  - Supplier Hub → Add to Buy List → Receive → Inventory
  - Inventory → Record Sale → Dashboard updates
- ✅ Build succeeds: `npm run build`
- ✅ Tests pass: `npm run test`

---

## 🎯 Agent Assignments

If using the agent team, delegate tasks:

1. **Backend Contracts QA Agent**: Test all API endpoints (use curl commands above)
2. **Frontend Flows QA Agent**: Walk through each page validation step
3. **Dashboard Agent**: Fix any Dashboard-specific issues
4. **Inventory Agent**: Fix any Inventory-specific issues
5. **Evaluator Agent**: Fix any BuyBox-specific issues
6. **Supplier Hub Agent**: Fix any Supplier Hub-specific issues
7. **Buying List Agent**: Fix any Buying List-specific issues
8. **Sourcing Agent**: Fix any Sourcing-specific issues
9. **Jobs Agent**: Fix any Jobs-specific issues
10. **Invoices Agent**: Fix any Invoices-specific issues
11. **Quality Lead Agent**: Coordinate overall effort and final sign-off

---

## 📝 Report Template

When reporting progress, use this format:

```markdown
## Frontend-Backend Connection Status

**Date**: YYYY-MM-DD
**Tested by**: [Your name]

### Working ✅
- [List what works]

### Not Working ❌
- [List what doesn't work, with specific error messages]

### Blockers 🚫
- [List anything preventing progress]

### Next Steps
- [List what needs to be done next]
```

---

## 🚨 Escalation Path

If stuck:
1. Check documentation: [README.md](../../README.md), [STATUS_AND_PLAN.md](STATUS_AND_PLAN.md)
2. Review code reference: [CODE_REFERENCE.md](../CODE_REFERENCE.md)
3. Check architecture: [ARCHITECTURE.md](../design/ARCHITECTURE.md)
4. Search for similar issues in the codebase
5. Ask Quality Lead agent for guidance
6. Create detailed bug report with reproduction steps

---

## 📚 Related Documentation

- [FRONTEND_BACKEND_CONNECTION_TASKS.md](FRONTEND_BACKEND_CONNECTION_TASKS.md) - Detailed task breakdown
- [AGENT_TEAM.md](AGENT_TEAM.md) - Agent responsibilities and API specs
- [QA_SWARM_PLAYBOOK.md](QA_SWARM_PLAYBOOK.md) - QA orchestration guide
- [STATUS_AND_PLAN.md](STATUS_AND_PLAN.md) - Current system status
- [ARCHITECTURE.md](../design/ARCHITECTURE.md) - System architecture
- [CODE_REFERENCE.md](../CODE_REFERENCE.md) - Code organization guide
