from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from . import models
from .routers import users, projects, tasks


# Create database tables
models.Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="TeamFlow API",
    version="1.0"
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow all origins (fixes Vercel CORS issue)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routers
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)


# Root endpoint
@app.get("/")
def root():
    return {"message": "TeamFlow API running"}