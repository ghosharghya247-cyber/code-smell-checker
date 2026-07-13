# Quick Start Guide

## Installation & Setup

### 1. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Access at: `http://localhost:3000`

### 2. Backend Setup (Choose one)

**Option A: Using Docker (Recommended)**
```bash
cd backend
docker-compose up
```

**Option B: Local Python**
```bash
cd backend
cp .env.example .env
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Access API at: `http://localhost:8000`

---

## First Usage

1. **Visit Frontend**: `http://localhost:3000`
2. **Paste Code**: Select language and paste source code
3. **Click Analyze**: Get instant code smell detection
4. **(Optional) Sign Up**: Create account to save history
5. **View History**: Check past analyses in History page

---

## API Testing

```bash
# Health check
curl http://localhost:8000/health

# Analyze code (anonymous)
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def long_function():\n  x = 1\n  y = 2\n...",
    "language": "python"
  }'
```

---

## Features Included

✅ Multi-language code smell detection  
✅ User authentication (signup/login)  
✅ Analysis history with pagination  
✅ Real-time analysis  
✅ Responsive UI (mobile-friendly)  
✅ Severity scoring system  
✅ Actionable recommendations  

---

## Common Issues & Solutions

### Port Already in Use
```bash
# Frontend (change port)
npm run dev -- -p 3001

# Backend (change port)
uvicorn app.main:app --reload --port 8001
```

### Database Connection Error
```bash
# Make sure PostgreSQL is running
# Check docker-compose.yml for credentials
# Or create your own PostgreSQL instance
```

### Module Not Found (Python)
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### CORS Error
- Frontend and backend are on different ports
- Backend CORS is configured in `.env` (CORS_ORIGINS)
- Update if needed and restart backend

---

## Project Structure

```
deploy_code_smell_checker/
├── frontend/                 # Next.js 15 app
│   ├── src/
│   │   ├── app/             # Pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities & API
│   │   └── styles/          # Tailwind
│   └── package.json
│
├── backend/                  # FastAPI app
│   ├── app/
│   │   ├── api/             # Endpoints
│   │   ├── core/            # Config & security
│   │   ├── models/          # Database & schemas
│   │   ├── detectors/       # Language detectors
│   │   ├── rules/           # Smell rules
│   │   ├── parsers/         # Code parsers
│   │   └── services/        # Business logic
│   ├── requirements.txt
│   └── Dockerfile
│
├── README.md                # Main documentation
└── IMPLEMENTATION.md        # Detailed guide
```

---

## Next: Deployment

### Frontend to Vercel
1. Push repo to GitHub
2. Connect to Vercel
3. Set env: `NEXT_PUBLIC_API_URL=<backend-url>`

### Backend to Render
1. Push repo to GitHub
2. Create Web Service on Render
3. Set env vars:
   - `DATABASE_URL=<supabase-connection>`
   - `JWT_SECRET=<random-key>`
   - `ENVIRONMENT=production`

### Database on Supabase
1. Create Supabase project
2. Get PostgreSQL URL
3. Add to Render `DATABASE_URL`

---

## Need Help?

- **README.md** - Full documentation
- **IMPLEMENTATION.md** - Detailed architecture
- **Code comments** - In-line explanations
- **API docs** - Visit `http://localhost:8000/docs` (auto-generated)

---

## Development Tips

### Frontend Hot Reload
Changes in `frontend/src/` auto-reload

### Backend Hot Reload
Changes in `backend/app/` auto-reload with `--reload`

### Add New Rule (Python)
1. Create class in `backend/app/rules/py_rules.py`
2. Extend `CodeSmellRule`
3. Implement `check()` method
4. Add to `PythonDetector.rules` list

### Add New Language
1. Create parser in `backend/app/parsers/`
2. Create detector in `backend/app/detectors/`
3. Add rules in `backend/app/rules/`
4. Register in `AnalysisService.detectors`
5. Update frontend `SUPPORTED_LANGUAGES`

---

**Ready to analyze code!** 🚀
