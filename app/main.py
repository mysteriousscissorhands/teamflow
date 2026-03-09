from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from . import models
from .routers import auth, users, projects, tasks

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TeamFlow API",
    description="TeamFlow Full Stack Task Management System",
    version="1.0.0"
)

# Allowed frontend origins
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://teamflow-six-sigma.vercel.app"
]

# Enable CORS so the Vercel frontend can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)


@app.get("/")
def root():
    return {"message": "TeamFlow API is running successfully"}