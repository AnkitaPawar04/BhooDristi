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
_new_columns = {
    "farmers": {
        "usual_crops": "TEXT",
        "soil_nitrogen": "FLOAT",
        "soil_phosphorus": "FLOAT",
        "soil_potassium": "FLOAT",
        "soil_ph": "FLOAT",
    },
    "chat_history": {
        "feedback": "INTEGER",
    },
}

for _table, _columns in _new_columns.items():
    _existing = {column["name"] for column in inspect(engine).get_columns(_table)}
    for _name, _type in _columns.items():
        if _name not in _existing:
            with engine.begin() as connection:
                connection.execute(text(f"ALTER TABLE {_table} ADD COLUMN {_name} {_type}"))

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
