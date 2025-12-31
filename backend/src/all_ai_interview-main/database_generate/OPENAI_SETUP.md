# OpenAI Integration Setup Guide

## Overview
The chat API now supports OpenAI GPT for advanced Natural Language to SQL conversion. This provides more sophisticated query generation compared to the rule-based approach.

## Setup Instructions

### 1. Install Dependencies
```bash
cd database_generate
pip install -r requirements.txt
```

This will install:
- `openai` - OpenAI Python SDK
- `python-dotenv` - Environment variable management

### 2. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you won't be able to see it again!)

### 3. Configure Environment Variables

Create a `.env` file in the `database_generate` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your API key:

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# Optional: Specify model (default: gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini

# Optional: Temperature for responses (default: 0.1)
OPENAI_TEMPERATURE=0.1
```

### 4. Restart API Server

```bash
python run_api.py
```

## How It Works

### Automatic Fallback System

The chat API uses a smart fallback system:

1. **OpenAI GPT (Primary)**: If API key is configured
   - Uses GPT-4o-mini or specified model
   - Converts complex natural language to SQL
   - Handles Thai and English questions
   - Understands context and relationships

2. **Rule-Based (Fallback)**: If OpenAI not available
   - Uses pattern matching
   - Handles common query types
   - Works offline
   - No API costs

### Response Indicators

Responses show which method was used:
- `🤖 AI` - Generated using OpenAI GPT
- `📋 Rule` - Generated using rule-based approach

## Supported Models

### Recommended Models:

1. **gpt-4o-mini** (Default)
   - Cost-effective
   - Fast responses
   - Good accuracy
   - ~$0.15 per 1M input tokens

2. **gpt-4o**
   - Highest accuracy
   - Better for complex queries
   - More expensive
   - ~$2.50 per 1M input tokens

3. **gpt-3.5-turbo**
   - Cheaper alternative
   - Faster but less accurate
   - ~$0.50 per 1M input tokens

## Example Queries

With OpenAI, you can ask more complex questions:

### Simple Queries (Both methods work):
- "มีกี่คนที่สัมภาษณ์?"
- "อายุเฉลี่ยคือเท่าไร?"
- "แบรนด์ไหนที่ได้รับความนิยม?"

### Complex Queries (OpenAI excels):
- "หาผู้ให้สัมภาษณ์ที่อายุมากกว่า 40 ปี และพูดถึง Sunlight ในเชิงบวก"
- "แสดงความสัมพันธ์ระหว่างอายุกับ sentiment ของ theme ความปลอดภัย"
- "เปรียบเทียบจำนวนการกล่าวถึงแบรนด์ระหว่างกลุ่มอายุต่างๆ"
- "หา theme ที่มี sentiment เป็น negative มากที่สุดในแต่ละ segment"

## Cost Estimation

### Typical Usage:
- Average query: ~500 tokens (input + output)
- Cost per query with gpt-4o-mini: ~$0.0001 (0.01 cents)
- 1,000 queries: ~$0.10
- 10,000 queries: ~$1.00

### Tips to Reduce Costs:
1. Use `gpt-4o-mini` instead of `gpt-4o`
2. Set lower temperature (0.1-0.3)
3. Cache common queries
4. Use rule-based for simple queries

## Troubleshooting

### Error: "OpenAI API key not found"
- Check `.env` file exists in `database_generate/`
- Verify `OPENAI_API_KEY` is set correctly
- Restart the API server

### Error: "Rate limit exceeded"
- You've exceeded your API quota
- Wait a few minutes or upgrade your plan
- System will automatically fall back to rule-based

### Error: "Invalid API key"
- Check your API key is correct
- Ensure no extra spaces in `.env`
- Verify key hasn't been revoked

### Slow Responses
- Normal for first request (cold start)
- Consider using `gpt-3.5-turbo` for faster responses
- Check your internet connection

## Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Use `.env.example` for templates

2. **Rotate API keys regularly**
   - Generate new keys monthly
   - Revoke old keys

3. **Set usage limits**
   - Configure spending limits in OpenAI dashboard
   - Monitor usage regularly

4. **Use environment-specific keys**
   - Different keys for dev/prod
   - Restrict key permissions

## Monitoring

Check OpenAI usage:
1. Go to [OpenAI Usage Dashboard](https://platform.openai.com/usage)
2. View token usage and costs
3. Set up billing alerts

## Disabling OpenAI

To disable OpenAI and use only rule-based:

1. Remove or comment out `OPENAI_API_KEY` in `.env`
2. Or set it to empty: `OPENAI_API_KEY=`
3. Restart API server

The system will automatically fall back to rule-based approach.

## Support

For issues:
- OpenAI API: https://help.openai.com/
- This project: Check logs in terminal
