# Complete Supabase Setup Guide

This comprehensive guide will walk you through migrating the Excel Manager from Firebase to Supabase. Follow each step carefully to ensure everything works correctly.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works great!)
- Basic understanding of SQL (we provide all the code)

---

## Part 1: Supabase Project Setup

## Part 1: Supabase Project Setup

### Step 1.1: Create Your Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `excel-manager` (or your preferred name)
   - **Database Password**: Create a strong password (save it somewhere safe!)
   - **Region**: Choose the closest to your location
4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning

### Step 1.2: Get Your API Keys

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **"API"** in the left menu
3. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbG...` (long string)
   - **service_role key**: `eyJhbG...` (different long string)

**Keep these safe!** You'll need them in Step 5.

---

## Part 2: Database Setup (The Important Part!)

### Step 2.1: Create Tables

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Copy and paste the following SQL script:

```sql
-- =====================================================
-- EXCEL MANAGER DATABASE SCHEMA
-- Privacy-First File Management System
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: folders
-- Stores the virtual folder hierarchy
-- =====================================================
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure folder names are unique within the same parent for each user
    CONSTRAINT unique_folder_name_per_parent UNIQUE (user_id, parent_id, name)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);

-- =====================================================
-- TABLE: files
-- Stores file metadata (actual files in Storage bucket)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    size BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT DEFAULT 'application/octet-stream',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure file names are unique within the same folder for each user
    CONSTRAINT unique_file_name_per_folder UNIQUE (user_id, folder_id, name)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_storage_path ON public.files(storage_path);

-- =====================================================
-- FUNCTION: Update timestamp on row update
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON public.folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Tables created successfully!';
    RAISE NOTICE '   - folders table';
    RAISE NOTICE '   - files table';
    RAISE NOTICE '';
    RAISE NOTICE '⏭️  Next step: Run the RLS policies script';
END $$;
```

4. Click **"Run"** (or press Ctrl/Cmd + Enter)
5. You should see: `✅ Tables created successfully!`

### Step 2.2: Enable Row Level Security (RLS)

This is **CRITICAL** for privacy! RLS ensures users can only access their own data.

1. In the SQL Editor, click **"New Query"** again
2. Copy and paste this script:

```sql
-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- Ensures users can ONLY access their own data
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FOLDERS POLICIES
-- =====================================================

-- Policy: Users can view their own folders
CREATE POLICY "Users can view own folders"
    ON public.folders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can create folders for themselves
CREATE POLICY "Users can create own folders"
    ON public.folders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own folders
CREATE POLICY "Users can update own folders"
    ON public.folders
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own folders
CREATE POLICY "Users can delete own folders"
    ON public.folders
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- FILES POLICIES
-- =====================================================

-- Policy: Users can view their own files
CREATE POLICY "Users can view own files"
    ON public.files
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can create files for themselves
CREATE POLICY "Users can create own files"
    ON public.files
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files"
    ON public.files
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
    ON public.files
    FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '🔒 Row Level Security enabled successfully!';
    RAISE NOTICE '   - Folders: 4 policies created';
    RAISE NOTICE '   - Files: 4 policies created';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Database setup complete!';
    RAISE NOTICE '⏭️  Next step: Configure Storage bucket';
END $$;
```

3. Click **"Run"**
4. You should see: `🔒 Row Level Security enabled successfully!`

---

## Part 3: Storage Setup

### Step 3.1: Create Storage Bucket

1. In the Supabase dashboard, click **"Storage"** in the left sidebar
2. Click **"Create a new bucket"**
3. Enter details:
   - **Name**: `spreadsheets`
   - **Public bucket**: **UNCHECK** this (keep it private!)
4. Click **"Create bucket"**

### Step 3.2: Configure Storage Policies

Storage policies ensure users can only access their own files. The policies are enforced through the file path structure (each user's files are stored under their user ID).

**Simplified Approach:**
Since our `useFileManager` hook stores files with paths like `{userId}/{timestamp}_{filename}`, we can use a simpler policy:

1. Click on the `spreadsheets` bucket
2. Go to **"Policies"** tab
3. Click **"New Policy"**
4. Choose **"For full customization"**
5. Add this policy:

**Name**: `Users can manage their own files`
**Policy command**: `ALL`
**Target roles**: `authenticated`

**USING expression**:
```sql
(bucket_id = 'spreadsheets'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

**WITH CHECK expression**:
```sql
(bucket_id = 'spreadsheets'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)
```

6. Click **"Review"** then **"Save policy"**

This single policy covers SELECT, INSERT, UPDATE, and DELETE operations.

---

## Part 4: Authentication Setup

### Step 4.1: Enable Email Authentication

1. Click **"Authentication"** in the left sidebar
2. Go to **"Providers"**
3. Make sure **"Email"** is enabled (it should be by default)
4. Configure settings:
   - **Enable email confirmations**: Optional (disable for easier testing)
   - **Secure email change**: Enabled
   - **Secure password change**: Enabled

---

## Part 5: Environment Configuration

### Step 5.1: Create `.env.local` File

In your project root, create a file named `.env.local`:

```bash
# =====================================================
# SUPABASE CONFIGURATION
# =====================================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-service-role-key

# =====================================================
# AI PROVIDER KEYS (Get free tier keys)
# =====================================================

# Groq (FASTEST - Try this first!)
# Get key: https://console.groq.com/keys
GROQ_API_KEY=gsk_...

# DeepSeek (BEST LOGIC)
# Get key: https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=sk-...

# X.AI (Grok)
# Get key: https://console.x.ai/
XAI_API_KEY=xai-...

# Cohere (FALLBACK)
# Get key: https://dashboard.cohere.com/api-keys
COHERE_API_KEY=...

# =====================================================
# NOTES:
# - You don't need ALL four AI providers
# - The waterfall will skip any that aren't configured
# - At least one provider is recommended for AI features
# =====================================================
```

### Step 5.2: Get AI Provider Keys (Free Tiers!)

**Groq** (Recommended - Fastest!)
1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up with GitHub or email
3. Go to "API Keys" → "Create API Key"
4. Copy the key (starts with `gsk_`)

**DeepSeek** (Best for Complex Logic)
1. Go to [https://platform.deepseek.com](https://platform.deepseek.com)
2. Sign up
3. Go to API Keys section
4. Create new key (starts with `sk-`)

**X.AI** (Grok)
1. Go to [https://console.x.ai](https://console.x.ai)
2. Sign up and get your API key

**Cohere** (Fallback)
1. Go to [https://dashboard.cohere.com](https://dashboard.cohere.com)
2. Sign up and get your API key from dashboard

> **Tip**: Start with just Groq. It's fast and has a generous free tier.

---

## Part 6: Run the Application

### Step 6.1: Install Dependencies

```bash
npm install
```

### Step 6.2: Start Development Server

```bash
npm run dev
```

### Step 6.3: Test the Application

1. Open [http://localhost:3000](http://localhost:3000)
2. You should see the login page
3. Click **"Don't have an account? Sign up"**
4. Create an account with an email and password (minimum 6 characters)
5. Sign in
6. You should see the main application interface

---

## Part 7: Verify Everything Works

### Test Checklist

- [ ] Can create an account
- [ ] Can sign in
- [ ] Can create a folder
- [ ] Can upload a file
- [ ] Can see the file in the file manager
- [ ] Can download the file
- [ ] Files from other users are NOT visible
- [ ] AI assistant responds (if you configured API keys)

---

## Troubleshooting

### "Missing Supabase environment variables"
- Check that `.env.local` exists in the project root
- Verify variable names match exactly (including `NEXT_PUBLIC_`)
- Restart dev server after adding variables

### "Row Level Security policy violation"
- Make sure you ran BOTH SQL scripts (tables + RLS policies)
- Check that you're logged in
- Verify policies in Dashboard → Authentication → Policies

### Files not uploading
- Check browser console for errors
- Verify storage bucket name is exactly `spreadsheets`
- Ensure storage policies are configured

### AI not responding
- Check that at least one AI API key is configured
- Look at browser console for errors
- Verify API keys are valid

---

## Security Best Practices

1. **Never commit `.env.local`** to git
2. **Never share your service role key**
3. **Keep anon key safe** (it's okay in client code)
4. **Regularly rotate API keys**
5. **Monitor Supabase logs** for suspicious activity

---

**🎉 Congratulations! Your privacy-first Excel Manager is ready!**

Your mother's sensitive data never leaves her device. The AI only sees column headers, not actual values. 🔒
