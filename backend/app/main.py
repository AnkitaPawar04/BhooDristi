from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from dotenv import load_dotenv
import os
from .routes import auth, crop, admin, weather, soil, irrigation, fertilizer, chatbot, market
from .database.config import Base, engine

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))
print("Google API Key Loaded:", bool(os.getenv("GOOGLE_PLACES_API_KEY")))
print("Earth Engine Project:", os.getenv("EE_PROJECT"))

# Create tables
Base.metadata.create_all(bind=engine)

# Keep the development SQLite database compatible with newly added profile fields.
if "usual_crops" not in {column["name"] for column in inspect(engine).get_columns("farmers")}:
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE farmers ADD COLUMN usual_crops TEXT"))

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
app.include_router(chatbot.router, prefix="/chatbot")
app.include_router(market.router)

app.include_router(
    chatbot.router,
    prefix="/chatbot"
)


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
