# Quick Setup Guide

Follow these steps to get your Excel Manager up and running.

## 1. Install Dependencies

```bash
cd excel-manager
npm install
```

## 2. Configure Firebase

### Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Follow the setup wizard

### Enable Services
1. **Authentication**: 
   - Go to Authentication → Get Started
   - Enable Email/Password provider
   
2. **Firestore Database**:
   - Go to Firestore Database → Create Database
   - Start in test mode (change rules later)
   
3. **Storage**:
   - Go to Storage → Get Started
   - Start in test mode

### Get Configuration
1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click the web icon (`</>`)
4. Copy the `firebaseConfig` object

### Add to Environment
1. Open `.env.local` file
2. Fill in the values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456:web:abcdef
```

## 3. Get AI API Keys

### DeepSeek
1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up / Log in
3. Go to API Keys section
4. Create new API key
5. Add to `.env.local`:
   ```env
   DEEPSEEK_API_KEY=sk-...
   ```

### Cohere
1. Go to [Cohere Dashboard](https://dashboard.cohere.com/)
2. Sign up / Log in
3. Go to API Keys
4. Copy your API key
5. Add to `.env.local`:
   ```env
   COHERE_API_KEY=...
   ```

### Groq
1. Go to [Groq Console](https://console.groq.com/)
2. Sign up / Log in
3. Go to API Keys
4. Create new key
5. Add to `.env.local`:
   ```env
   GROQ_API_KEY=gsk_...
   ```

### X.AI (Grok)
1. Go to [X.AI Console](https://console.x.ai/)
2. Sign up / Log in
3. Get API key
4. Add to `.env.local`:
   ```env
   XAI_API_KEY=...
   ```

> **Note**: You don't need ALL four providers. The waterfall will skip any that aren't configured.

## 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Test the Application

1. **Upload a File**: Drag and drop an Excel file or click "Upload Files"
2. **View Spreadsheet**: Click on a file to open it in the editor
3. **Use AI Assistant**: Ask questions like:
   - "Create a profit margin column"
   - "Calculate the average of column B"
   - "Convert prices from USD to EUR"

## Troubleshooting

### Firebase Errors
- Make sure all services are enabled in Firebase Console
- Check that API keys are correct in `.env.local`
- Verify Firebase rules allow read/write in test mode

### AI Not Working
- Check that at least one AI API key is configured
- Look in browser console for error messages
- Verify API keys are valid and have available quota

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

## Next Steps

### Production Deployment
1. Push code to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Security
Before going to production:
1. Update Firebase Security Rules
2. Enable Firebase Authentication
3. Add user authentication flow
4. Move AI API calls to server-side API routes

## Need Help?

Check the main [README.md](./README.md) for more detailed information.
