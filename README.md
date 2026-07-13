# Code Smell Detector

A production-ready web application for analyzing source code to detect code smells. Supports JavaScript/TypeScript, Python, Java, Go, and C#.

## Project Structure

```
.
├── frontend/          # Next.js 15 frontend application
└── backend/           # FastAPI backend service
```

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Component library
- **Zustand** - State management
- **Axios** - HTTP client

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM
- **Pydantic** - Data validation
- **PostgreSQL** - Database
- **Python 3.12** - Runtime

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL (or use Docker)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Access at `http://localhost:3000`

### Backend Setup

**Option 1: Using Docker Compose**
```bash
cd backend
docker-compose up
```

**Option 2: Local Python Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Access API at `http://localhost:8000`

## API Endpoints

### Analysis
- `POST /api/analyze` - Analyze code for smells
- `GET /health` - Health check

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/session` - Get current session

### History (Authenticated)
- `GET /api/history` - Get user's analysis history
- `GET /api/history/{id}` - Get specific analysis
- `DELETE /api/history/{id}` - Delete specific analysis
- `DELETE /api/history` - Clear all history

## Development

### Frontend Development
```bash
cd frontend
npm run dev       # Start dev server
npm run build     # Build for production
npm run lint      # Run ESLint
npm run type-check # Check TypeScript
```

### Backend Development
```bash
cd backend
python app/main.py        # Run app
pytest                    # Run tests
```

## Deployment

### Frontend - Vercel
```bash
# Connect your GitHub repo to Vercel
# Set environment variable: NEXT_PUBLIC_API_URL
```

### Backend - Render
```bash
# Connect your GitHub repo to Render
# Set environment variables in Render dashboard:
# - DATABASE_URL
# - JWT_SECRET
# - ENVIRONMENT
```

## Database Setup

The application automatically creates tables on startup. For initial setup with Docker:

```bash
cd backend
docker-compose up
# Tables are created automatically
```

## Code Smell Rules

### Python
- Long functions (>50 lines warning, >100 lines error)
- Too many parameters (>5)
- Wildcard imports
- Bare except clauses
- Mutable default arguments

### JavaScript
- Long functions (>50 lines)
- Deep nesting (>4 levels)
- Magic numbers
- Unused variables

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/codesmell
JWT_SECRET=your-secret-key
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Testing

### Frontend
```bash
cd frontend
npm test
```

### Backend
```bash
cd backend
pytest tests/
```

## Security

- ✅ HTTPS enforcement in production
- ✅ CORS protection
- ✅ SQL injection prevention (SQLAlchemy ORM)
- ✅ XSS protection (proper escaping)
- ✅ Password hashing (bcrypt)
- ✅ JWT authentication
- ✅ Input validation
- ✅ Rate limiting ready

## Performance Optimizations

- Code analysis caching (SHA-256 based)
- Database indexing on frequently queried columns
- CDN support for frontend assets (Vercel)
- Modular detector system for easy scaling

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT

## Support

For issues and questions, please refer to the project documentation or create an issue in the repository.
