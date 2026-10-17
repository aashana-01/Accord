from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import models
from app.db import Base, engine
Base.metadata.create_all(bind=engine)

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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Welcome to the Accord API"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "accord-api"}
