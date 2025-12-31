# Dashboard Integration Guide

## Overview

The dashboard frontend now fetches data from the FastAPI backend instead of using hardcoded mockup data.

## Setup Instructions

### 1. Start the API Server

First, make sure the API server is running:

```bash
cd c:\work\AIInterviewer\database_generate

# Install dependencies (if not already done)
pip install -r requirements.txt

# Initialize database (if not already done)
python init_database.py

# Start the API server
python run_api.py
```

The API will be available at: **http://localhost:8000**

### 2. Start the Dashboard Frontend

In a new terminal:

```bash
cd c:\work\AIInterviewer\dashboard\frontend

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

The dashboard will be available at: **http://localhost:5173**

## Architecture

### Frontend Structure

```
dashboard/frontend/src/
├── App.jsx              # Main dashboard component
├── config.js            # Configuration (API URL)
├── services/
│   └── api.js          # API service layer
└── data.json           # Legacy data (no longer used)
```

### API Integration

**API Service (`services/api.js`)**
- `fetchInterviews()` - Get all interviews
- `fetchInterviewDetail(id)` - Get interview with persona, transcript, brands, themes
- `fetchPersonas()` - Get all personas
- `fetchBrands()` - Get all brands
- `fetchThemes()` - Get all themes
- `fetchAnalyticsSummary()` - Get analytics data
- `transformDataForDashboard()` - Transform API data for dashboard display

**App Component (`App.jsx`)**
- Uses `useState` and `useEffect` hooks
- Loads data from API on component mount
- Shows loading spinner while fetching data
- Shows error message if API is unavailable
- Displays data once loaded

## Features

### Loading State
- Animated spinner
- "Loading dashboard data..." message
- Shown while fetching from API

### Error Handling
- User-friendly error message
- Instructions to check API server
- Retry button to reload data

### Data Display
- **Overview Tab**: Statistics, brand distribution, demographics
- **Themes Tab**: Theme frequency and sentiment breakdown
- **Insights Tab**: Persona insights (Want/But/So framework)
- **Transcripts Tab**: Full interview transcripts
- **Findings Tab**: Key findings and recommendations

## Configuration

Create a `.env` file in the frontend directory (optional):

```bash
REACT_APP_API_URL=http://localhost:8000
```

Default API URL is `http://localhost:8000` if not specified.

## Troubleshooting

### "Failed to fetch" Error

**Problem**: Dashboard shows error message about failed API connection

**Solutions**:
1. Make sure API server is running at `http://localhost:8000`
2. Check API server terminal for errors
3. Verify database is initialized (`interview_data.db` exists)
4. Try accessing http://localhost:8000/docs directly in browser

### CORS Issues

**Problem**: Browser console shows CORS errors

**Solution**: The API already has CORS enabled for all origins. If issues persist:
- Check browser console for specific error
- Verify API server is running on port 8000
- Try clearing browser cache

### Empty Data

**Problem**: Dashboard loads but shows no data

**Solutions**:
1. Check API server logs for errors
2. Verify database has data: `python init_database.py`
3. Test API endpoints directly: http://localhost:8000/interviews
4. Check browser console for JavaScript errors

## Development

### Adding New API Endpoints

1. Add function to `services/api.js`:
```javascript
export const fetchNewData = async () => {
  const response = await fetch(`${API_BASE_URL}/new-endpoint`);
  if (!response.ok) throw new Error('Failed to fetch new data');
  return response.json();
};
```

2. Use in `App.jsx`:
```javascript
import { fetchNewData } from './services/api';

// In useEffect or event handler
const data = await fetchNewData();
```

### Modifying Data Transformation

Edit the `transformDataForDashboard()` function in `services/api.js` to change how API data is mapped to dashboard format.

## API Endpoints Used

- `GET /interviews` - List all interviews
- `GET /interviews/{id}` - Interview details with transcript
- `GET /personas` - All personas
- `GET /brands` - All brands
- `GET /analytics/summary` - Analytics summary

See full API documentation at: http://localhost:8000/docs
