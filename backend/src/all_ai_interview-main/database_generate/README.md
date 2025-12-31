# Interview Data API

Python backend API with SQLite database for Dishwashing Liquid Market Research Interview Data.

## Features

- **SQLite Database**: Lightweight, file-based database with all interview data
- **FastAPI**: Modern, fast REST API framework
- **CORS Enabled**: Ready for frontend integration
- **Comprehensive Endpoints**: Access interviews, personas, brands, themes, and transcripts

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Initialize Database

Import CSV data from `data_ai` folder into SQLite:

```bash
python init_database.py
```

This will:

- Create `interview_data.db` SQLite database
- Import all CSV files from `data_ai/` folder
- Set up proper relationships and indexes

### 3. Run API Server

```bash
python run_api.py
```

Or using uvicorn directly:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: **http://localhost:8000**

## Project Structure

```
database_generate/
├── app/
│   ├── __init__.py
│   ├── main.py              # Main FastAPI application
│   ├── models.py            # Pydantic models
│   ├── database.py          # Database utilities
│   └── routes/
│       ├── __init__.py
│       ├── segments.py      # Segments endpoints
│       ├── interviews.py    # Interviews endpoints
│       ├── personas.py      # Personas endpoints
│       ├── brands.py        # Brands endpoints
│       ├── themes.py        # Themes endpoints
│       ├── transcripts.py   # Transcripts endpoints
│       └── analytics.py     # Analytics endpoints
├── data_ai/                 # CSV data files
├── init_database.py         # Database initialization script
├── run_api.py              # API server launcher
├── requirements.txt         # Python dependencies
└── interview_data.db       # SQLite database (created after init)
```

## API Documentation

Once the server is running, visit:

- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### Core Resources

- `GET /segments` - Get all segments
- `GET /segments/{segment_id}` - Get segment by ID
- `GET /interviews` - Get all interviews (with filters)
- `GET /interviews/{interview_id}` - Get complete interview details
- `GET /personas` - Get all personas (with filters)
- `GET /brands` - Get all brands
- `GET /brands/{brand_id}` - Get brand details with perceptions
- `GET /themes` - Get all themes
- `GET /themes/{theme_id}` - Get theme insights
- `GET /transcripts/{interview_id}` - Get interview transcript

### Search & Analytics

- `GET /search/transcripts?q={query}` - Search transcript content
- `GET /analytics/summary` - Get overall analytics summary

## Database Schema

### Main Tables

1. **segments** - Customer segments (25 segments)
2. **interviews** - Interview records (P1-P25)
3. **personas** - Detailed persona information
4. **brands** - Brand information (Sunlight, LiponF, etc.)
5. **themes** - Research themes (33 themes)
6. **transcript_lines** - Full interview transcripts
7. **interview_brands** - Interview-Brand relationships
8. **interview_themes** - Interview-Theme relationships
9. **brand_perceptions** - Brand perception data
10. **product_attributes** - Product attribute preferences
11. **purchase_behaviors** - Purchase behavior patterns

## Example Usage

### Get All Interviews

```bash
curl http://localhost:8000/interviews
```

### Get Interview Detail

```bash
curl http://localhost:8000/interviews/P1
```

### Search Transcripts

```bash
curl "http://localhost:8000/search/transcripts?q=Sunlight"
```

### Get Analytics Summary

```bash
curl http://localhost:8000/analytics/summary
```

### Filter Personas by Age

```bash
curl "http://localhost:8000/personas?min_age=30&max_age=40"
```

## Integration with Dashboard

Update your React dashboard to fetch data from the API:

```javascript
// Example: Fetch interviews
const response = await fetch('http://localhost:8000/interviews');
const interviews = await response.json();
```

## Database File

- **Location**: `database_generate/interview_data.db`
- **Type**: SQLite 3
- **Size**: ~1-2 MB (depending on data)

## Development

### Re-initialize Database

To reset and re-import data:

```bash
python init_database.py
```

This will delete the existing database and create a fresh one from CSV files.

### Check Database

Use any SQLite client to inspect the database:

```bash
sqlite3 interview_data.db
```

```sql
-- Example queries
SELECT COUNT(*) FROM interviews;
SELECT * FROM personas LIMIT 5;
SELECT brand_name, COUNT(*) FROM interview_brands 
  JOIN brands USING(brand_id) 
  GROUP BY brand_name;
```

## Notes

- The API uses CORS middleware allowing all origins (suitable for development)
- For production, configure CORS to allow only specific origins
- Database is created automatically from CSV files
- All timestamps are in ISO 8601 format
