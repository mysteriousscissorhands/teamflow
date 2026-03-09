from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from . import models
from .routers import users, projects, tasks

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TeamFlow API",
    version="1.0"
)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://teamflow-six-sigma.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)


@app.get("/")
def root():
    return {"message": "TeamFlow API running"}