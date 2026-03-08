from fastapi import FastAPI
from .database import engine, Base
from . import models
from .routers import users, projects, tasks
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()


app = FastAPI(title="TeamFlow API")

Base.metadata.create_all(bind=engine)

app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)


@app.get("/")
def home():
    return {"message": "TeamFlow API running"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)