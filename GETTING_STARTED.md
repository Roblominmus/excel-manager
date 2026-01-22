# Getting Started - Excel Manager with Supabase

Your project is **fully built and ready to run!** ✅

## Quick Start Checklist

### 1. ✅ Project Setup
- [x] Dependencies installed (`npm install`)
- [x] Build succeeds (`npm run build`)
- [x] Development server works (`npm run dev`)

### 2. 📝 Configure Environment Variables

Create a `.env.local` file in the project root with your Supabase credentials:

```bash
# Get these from your Supabase project
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Provider Keys (at least one required)
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...
XAI_API_KEY=xai-...
COHERE_API_KEY=...
```

**See `.env.local.example` for the complete template.**

### 3. 🗄️ Set Up Supabase (CRITICAL!)

Follow the detailed instructions in **[SETUP.md](./SETUP.md)**:

1. **Create Supabase Project**
   - Go to https://supabase.com/dashboard
   - Create a new project
   - Save your API keys

2. **Create Database Tables**
   - In SQL Editor, run the SQL script from SETUP.md
   - Creates `folders` and `files` tables

3. **Enable Row Level Security**
   - Run the RLS policies script
   - Ensures users can only access their own data

4. **Create Storage Bucket**
   - Create bucket named `spreadsheets`
   - Set up storage policies

5. **Enable Email Authentication**
   - Already enabled by default
   - Allows sign-up and sign-in

### 4. 🚀 Run the Application

```bash
# Development mode with live reload
npm run dev

# Visit http://localhost:3000
```

### 5. 🔐 Test the Flow

1. **Go to Login Page** → http://localhost:3000/login
2. **Create Account** → Click "Sign up" and enter email + password
3. **Sign In** → Use your credentials
4. **You should see the main app** with:
   - File Manager (left sidebar)
   - Spreadsheet Editor (center)
   - AI Assistant (right sidebar)

---

## Routes Overview

| Route | Purpose |
|-------|---------|
| `/` | Main application (requires auth) |
| `/login` | Sign in / Sign up page |
| `/auth/logout` | Sign out and redirect to login |

---

## File Structure

```
excel-manager/
├── .env.local              ← Your environment variables (create this!)
├── .env.local.example      ← Template for .env.local
├── SETUP.md                ← Complete Supabase setup guide
├── README.md               ← Architecture overview
├── app/
│   ├── page.tsx           ← Main application page
│   ├── login/page.tsx     ← Login page
│   ├── auth/logout/page.tsx ← Logout handler
│   └── layout.tsx         ← Root layout
├── components/
│   ├── Auth/Login.tsx     ← Authentication UI
│   ├── FileManager.tsx    ← File browser with folders
│   ├── SpreadsheetEditor.tsx ← Excel editor
│   └── AIAssistant.tsx    ← AI chat interface
├── hooks/
│   ├── useFileManager.ts  ← Folder & file operations
│   ├── useFileUpload.ts   ← File upload logic
│   └── useAIAssistant.ts  ← AI interaction
├── lib/
│   ├── supabase/          ← Supabase configuration
│   ├── ai/waterfall.ts    ← AI fallback logic
│   └── utils.ts           ← Helper functions
└── services/
    └── providers/         ← AI provider implementations
```

---

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install @supabase/supabase-js
```

### "SUPABASE_URL is not defined"
You need to set up `.env.local`. See section 2 above.

### Login redirects to itself
- Make sure Supabase Auth is enabled
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct

### Can't upload files
- Verify Supabase storage bucket `spreadsheets` exists
- Check RLS policies are enabled
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (for server operations)

### AI Assistant not responding
- Verify at least one AI API key is configured in `.env.local`
- Check browser console for error messages
- API keys must have available quota

---

## Next Steps

1. **Configure `.env.local`** with your Supabase credentials
2. **Follow SETUP.md** to set up your Supabase database
3. **Run the dev server** with `npm run dev`
4. **Test the application** by creating an account and uploading a file

---

## Key Features

✅ **Privacy-First AI**
- AI only sees column headers, never actual data
- All formulas execute client-side
- Your spreadsheets never leave your device

✅ **AI Waterfall**
- Automatic fallback across 4 AI providers
- Groq → DeepSeek → X.AI → Cohere
- Handles rate limits gracefully

✅ **Virtual Folders**
- Organize files in folders (Google Drive style)
- Folder hierarchy stored in PostgreSQL
- Full file and folder management

✅ **Row Level Security**
- Database-enforced access control
- Users can only see their own files
- Secure by design

---

## Documentation

- **[README.md](./README.md)** - Architecture, AI waterfall, security overview
- **[SETUP.md](./SETUP.md)** - Complete setup guide with SQL scripts
- **[QUICKREF.md](./QUICKREF.md)** - Code examples and API reference
- **[MIGRATION.md](./MIGRATION.md)** - Firebase to Supabase migration details

---

**Ready to start? 🚀 Follow the checklist above and you'll be up and running in minutes!**
