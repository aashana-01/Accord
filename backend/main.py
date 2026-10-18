from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models
from app.db import Base, engine
from app.api.topics import router as topics_router
from app.api.channels import router as channels_router
from app.api.workspace import router as workspace_router
from app.migrations import ensure_columns

Base.metadata.create_all(bind=engine)
ensure_columns()  # adds new columns to an older accord.db

app = FastAPI(
    title="Accord API",
    description="Backend API for Discord conversation intelligence.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PATCH, DELETE
    allow_headers=["*"],
)

app.include_router(topics_router)
app.include_router(channels_router)
app.include_router(workspace_router)


@app.get("/")
def root():
    return {"message": "Welcome to the Accord API"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "accord-api"}
