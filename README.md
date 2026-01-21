# Excel Manager - Privacy-First AI Spreadsheet Editor

A Next.js web application for managing and editing Excel spreadsheets with AI assistance, built for handling sensitive data securely. Features a virtual folder structure, spreadsheet editor, and an AI assistant that **NEVER** sees your actual data.

## 🔒 Privacy-First Architecture (Critical!)

This application is designed for users handling **sensitive financial, medical, or personal data**. The AI architecture ensures complete data privacy:

### What the AI Sees
- ✅ **Column headers only** (e.g., "Cost", "Revenue", "Profit Margin")
- ✅ **Data types** (number, string, date)
- ✅ **Your natural language request** (e.g., "Calculate profit margin")

### What the AI NEVER Sees
- ❌ **No actual spreadsheet rows**
- ❌ **No cell values**
- ❌ **No sensitive information**

### How It Works
1. **You ask**: "Calculate profit margin"
2. **We send**: Only headers `{Cost: number, Revenue: number}` + your question
3. **AI returns**: Excel formula `=(B2-A2)/B2` or JavaScript function
4. **Your browser**: Applies formula to data locally
5. **Result**: New column with calculations - **data never left your device**

## 🚀 Features

- **Virtual Folder System**: Organize spreadsheets in folders (backed by Supabase database)
- **File Manager**: Google Drive-like interface with folder hierarchy
- **Spreadsheet Editor**: View and edit Excel files with a familiar grid interface
- **AI Assistant**: Natural language interface for creating formulas and transformations
- **AI Waterfall**: Automatic failover across 4 AI providers (Groq → DeepSeek → X.AI → Cohere)
- **Supabase Backend**: Authentication, PostgreSQL database, and Storage with Row Level Security

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **Spreadsheet**: react-data-grid, xlsx
- **AI Providers**: Groq, DeepSeek, X.AI, Cohere (free tiers)

## 📦 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase
Follow the detailed setup guide in **[SETUP.md](./SETUP.md)** which includes:
- Creating your Supabase project
- Running SQL migrations for database tables
- Setting up Row Level Security policies
- Creating the storage bucket
- Configuring environment variables

### 3. Configure Environment
Create `.env.local` with your credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Provider Keys (Get free tier keys)
GROQ_API_KEY=your_groq_key
DEEPSEEK_API_KEY=your_deepseek_key
XAI_API_KEY=your_xai_key
COHERE_API_KEY=your_cohere_key
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
excel-manager/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Main application page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Auth/
│   │   └── Login.tsx      # Email/Password authentication
│   ├── FileManager.tsx    # Virtual folder browser
│   ├── SpreadsheetEditor.tsx  # Excel grid editor
│   └── AIAssistant.tsx    # AI chat interface
├── hooks/                 # Custom React hooks
│   ├── useFileManager.ts  # Folder & file operations (Supabase)
│   ├── useSpreadsheet.ts  # Spreadsheet operations
│   └── useAIAssistant.ts  # AI interaction
├── lib/                   # Core utilities
│   ├── supabase/
│   │   ├── client.ts      # Supabase client initialization
│   │   └── database.types.ts  # TypeScript database types
│   ├── ai/
│   │   └── waterfall.ts   # AI fallback orchestration
│   └── utils.ts           # Helper functions
├── services/              # Business logic
│   ├── ai-service.ts      # AI request handling
│   └── providers/         # Individual AI providers
│       ├── groq.ts        # Groq (fastest)
│       ├── deepseek.ts    # DeepSeek (best logic)
│       ├── xai.ts         # X.AI
│       └── cohere.ts      # Cohere (fallback)
└── types/                 # TypeScript definitions
    ├── ai.ts              # AI types
    ├── file.ts            # File types
    └── spreadsheet.ts     # Spreadsheet types
```

## 🤖 AI Waterfall Strategy

The AI service implements an intelligent fallback system across 4 free-tier providers:

### Priority Order
1. **Groq** (Llama 3.1) - ⚡ Fastest response time (~500ms)
2. **DeepSeek** - 🧠 Best logical reasoning for complex formulas
3. **X.AI** (Grok) - ⚖️ Good balance of speed and quality
4. **Cohere** - 🛡️ Reliable fallback option

### How It Works
```
User Request → Try Groq
              ↓ (if 429/5xx error)
              Try DeepSeek
              ↓ (if 429/5xx error)
              Try X.AI
              ↓ (if 429/5xx error)
              Try Cohere
              ↓ (if all fail)
              Return Error
```

### Error Handling
- **429 (Rate Limit)**: Immediately try next provider
- **5xx (Server Error)**: Immediately try next provider
- **Timeout (>15s)**: Move to next provider
- **Success**: Return result with provider name

This ensures **maximum uptime** even with free-tier API limits. When one provider hits its limit, the next one seamlessly takes over.

## 🔐 Security Architecture

### Data Privacy Guarantees
- ✅ **AI only receives column headers and types** - Never actual cell values
- ✅ **All transformations execute client-side** - Data processed in your browser
- ✅ **Row Level Security (RLS)** - Users can only access their own files/folders
- ✅ **Supabase Storage** - Files encrypted at rest
- ✅ **No data logging** - AI providers never store your spreadsheet data

### Example: What Gets Sent to AI

**Your Spreadsheet:**
| Revenue | Cost | Profit |
|---------|------|--------|
| $10,000 | $6,000 | $4,000 |
| $15,000 | $8,000 | $7,000 |

**What AI Receives:**
```json
{
  "userQuery": "Calculate profit margin as percentage",
  "schema": {
    "headers": ["Revenue", "Cost", "Profit"],
    "columnTypes": {
      "Revenue": "number",
      "Cost": "number",
      "Profit": "number"
    }
  }
}
```

**AI Response:**
```json
{
  "type": "formula",
  "code": "=(C2/A2)*100",
  "explanation": "Profit margin = (Profit ÷ Revenue) × 100"
}
```

**Your Browser:**
Applies the formula to all rows locally. **The AI never saw your $10,000, $6,000, or any actual values!**

### Supabase Security
- **Row Level Security (RLS)**: PostgreSQL policies ensure users can only query their own data
- **JWT Authentication**: Secure token-based auth with automatic refresh
- **Storage Security**: Files are private by default, accessible only by file owner

## 📝 Usage Examples

### Ask the AI Assistant

**"Create a profit margin column"**
```javascript
// AI generates:
=(Revenue - Cost) / Revenue * 100
// Applied locally to all rows
```

**"Convert prices from USD to EUR"**
```javascript
// AI generates:
=PriceUSD * 0.92
// Applied locally to all rows
```

**"Flag high-value customers"**
```javascript
// AI generates JavaScript:
row.HighValue = row.TotalSpent > 10000 ? "Yes" : "No"
// Executed locally in browser
```

### File Management

**Create Folders:**
```typescript
const folder = await createFolder("2024 Reports", parentFolderId);
```

**Upload Files:**
```typescript
const file = await uploadFile(excelFile, folderId);
```

**Move Files:**
```typescript
await moveFile(fileId, newFolderId);
```

## 🗄️ Database Schema

### Tables

**folders**
- `id` (uuid, primary key)
- `name` (text)
- `parent_id` (uuid, nullable, foreign key to folders)
- `user_id` (uuid, foreign key to auth.users)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**files**
- `id` (uuid, primary key)
- `name` (text)
- `folder_id` (uuid, nullable, foreign key to folders)
- `storage_path` (text, unique)
- `user_id` (uuid, foreign key to auth.users)
- `size` (bigint)
- `mime_type` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**RLS Policies:** Users can only access rows where `user_id = auth.uid()`

## 🚀 Deploy on Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`, `COHERE_API_KEY`
4. Deploy

```bash
npm run build
```

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide with SQL scripts
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Technical overview

## 🤝 Contributing

This project is designed for privacy-conscious users. When contributing:
1. Never add features that send raw data to external services
2. Always validate that only schema (not data) is sent to AI
3. Test RLS policies thoroughly
4. Document security implications of changes

## 📄 License

MIT License - See LICENSE file for details

---

**Built with privacy in mind. Your data, your control. 🔒**
