"""
Main FastAPI Application
Modular structure with separate route modules
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import route modules
from app.routes import segments, interviews, personas, brands, themes, transcripts, analytics, chat, insights

# Initialize FastAPI app
app = FastAPI(
    title="Interview Data API",
    description="API for Dishwashing Liquid Market Research Interview Data",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(segments.router)
app.include_router(interviews.router)
app.include_router(personas.router)
app.include_router(brands.router)
app.include_router(themes.router)
app.include_router(transcripts.router)
app.include_router(analytics.router)
app.include_router(chat.router)
app.include_router(insights.router)

@app.get("/")
def read_root():
    """API root endpoint"""
    return {
        "message": "Interview Data API",
        "version": "2.0.0",
        "documentation": "/docs",
        "endpoints": {
            "segments": "/segments",
            "interviews": "/interviews",
            "personas": "/personas",
            "brands": "/brands",
            "themes": "/themes",
            "transcripts": "/transcripts/{interview_id}",
            "search_transcripts": "/transcripts/search/text?q={query}",
            "analytics": "/analytics/summary"
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
