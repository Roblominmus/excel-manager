# Excel Manager - AI-Powered Spreadsheet Editor

A Next.js web application for managing and editing Excel spreadsheets with AI assistance. Features a Google Drive-like file manager, spreadsheet editor, and an AI assistant that respects your data privacy.

## 🔒 Privacy-First AI

**The AI never sees your actual data.** It only receives:
- Column headers
- Data types
- Your natural language request

The AI generates Excel formulas or JavaScript transformations that execute locally in your browser.

## 🚀 Features

- **File Manager**: Google Drive-like interface for uploading and organizing Excel files
- **Spreadsheet Editor**: View and edit Excel files with a familiar grid interface
- **AI Assistant**: Natural language interface for creating formulas and transformations
- **AI Waterfall**: Automatic failover across 4 AI providers (DeepSeek, Cohere, Groq, X.AI)
- **Firebase Integration**: Authentication, Firestore, and Storage

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Spreadsheet**: react-data-grid, xlsx
- **AI Providers**: DeepSeek, Cohere, Groq, X.AI

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration

1. Copy the environment template:
```bash
cp .env.example .env.local
```

2. Fill in your Firebase credentials:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication, Firestore, and Storage
   - Copy your config to `.env.local`

3. Add your AI API keys to `.env.local`:
   - [DeepSeek](https://platform.deepseek.com/) - Get API key
   - [Cohere](https://dashboard.cohere.com/) - Get API key
   - [Groq](https://console.groq.com/) - Get API key
   - [X.AI](https://console.x.ai/) - Get API key

## Getting Started

Run the development server:

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
│   ├── FileManager.tsx    # Google Drive-like file browser
│   ├── SpreadsheetEditor.tsx  # Excel grid editor
│   └── AIAssistant.tsx    # AI chat interface
├── hooks/                 # Custom React hooks
│   ├── useFileUpload.ts   # File upload logic
│   ├── useSpreadsheet.ts  # Spreadsheet operations
│   └── useAIAssistant.ts  # AI interaction
├── lib/                   # Utilities and config
│   ├── firebase.ts        # Firebase initialization
│   └── utils.ts           # Helper functions
├── services/              # Business logic
│   ├── ai-service.ts      # AI Waterfall orchestration
│   └── providers/         # Individual AI providers
│       ├── deepseek.ts
│       ├── cohere.ts
│       ├── groq.ts
│       └── xai.ts
└── types/                 # TypeScript definitions
    ├── ai.ts
    ├── file.ts
    └── spreadsheet.ts
```

## 🤖 AI Waterfall

The AI service implements a robust fallback system:

1. **Try DeepSeek** - If it fails (rate limit, error)...
2. **Try Cohere** - If it fails...
3. **Try Groq** - If it fails...
4. **Try X.AI** - If all fail, return error

This ensures maximum uptime even with free-tier API limits.

## 🔐 Security Architecture

### Data Privacy
- ✅ AI only receives column headers and types
- ✅ No actual row data sent to AI services
- ✅ All transformations execute client-side
- ✅ Full data stays in Firebase Storage (your control)

### Example AI Request
```json
{
  "userQuery": "Calculate profit margin",
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

The AI never sees your actual data like `[$100, $50, $50]`!

## 📝 Usage Examples

### Ask the AI Assistant

**"Create a profit margin column"**
```javascript
// AI generates:
row.ProfitMargin = ((row.Revenue - row.Cost) / row.Revenue) * 100
```

**"Convert prices to euros"**
```javascript
// AI generates:
row.PriceEUR = row.PriceUSD * 0.92
```

## Deploy on Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard
4. Deploy

```bash
npm run build
```

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
