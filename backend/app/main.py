from fastapi import FastAPI
from fastapi.responses import JSONResponse
from app.core.middleware import add_middleware
from app.core.database import Base, engine
from app.api import analysis, history, auth, ai_chat

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Code Smell Detector API",
    description="Analyze source code for code smells",
    version="1.0.0",
)

app = add_middleware(app)

app.include_router(analysis.router)
app.include_router(history.router)
app.include_router(auth.router)
app.include_router(ai_chat.router)


@app.get("/")
async def root():
    return {"message": "Code Smell Detector API v1.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
