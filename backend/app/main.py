from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from .routes import auth, crop, admin, weather, soil, irrigation, fertilizer
from .database.config import Base, engine

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))
print("Google API Key Loaded:", bool(os.getenv("GOOGLE_PLACES_API_KEY")))
print("Earth Engine Project:", os.getenv("EE_PROJECT"))

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="BhooDrishti API",
    description="Agriculture recommendation system for Maharashtra farmers",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(crop.router)
app.include_router(admin.router)
app.include_router(weather.router)
app.include_router(soil.router)
app.include_router(irrigation.router)
app.include_router(fertilizer.router)
@app.get("/")
async def root():
    return {
        "message": "Welcome to BhooDrishti API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
