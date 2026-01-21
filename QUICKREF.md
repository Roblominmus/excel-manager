# Quick Reference - Using the New Supabase Infrastructure

This guide provides quick code examples for using the new Supabase-based infrastructure.

## Table of Contents
1. [Authentication](#authentication)
2. [File Management](#file-management)
3. [AI Assistant](#ai-assistant)
4. [Database Queries](#database-queries)

---

## Authentication

### Check if User is Logged In

```typescript
import { supabase, isAuthenticated, getCurrentUserId } from '@/lib/supabase/client';

// Check auth status
const loggedIn = await isAuthenticated();

// Get current user ID
const userId = await getCurrentUserId();

// Get full user object
const { data: { user } } = await supabase.auth.getUser();
```

### Sign Up

```typescript
import { supabase } from '@/lib/supabase/client';

const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password',
});

if (error) {
  console.error('Sign up error:', error.message);
} else {
  console.log('User created:', data.user);
}
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password',
});
```

### Sign Out

```typescript
const { error } = await supabase.auth.signOut();
```

### Listen for Auth Changes

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    if (event === 'SIGNED_IN') {
      console.log('User signed in:', session?.user);
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
    }
  }
);

// Cleanup
subscription.unsubscribe();
```

---

## File Management

### Using the useFileManager Hook

```typescript
import { useFileManager } from '@/hooks/useFileManager';

function MyComponent() {
  const {
    folders,
    currentFolder,
    loading,
    error,
    createFolder,
    uploadFile,
    downloadFile,
    deleteFile,
    moveFile,
    fetchFolderHierarchy,
  } = useFileManager();

  // Access folder hierarchy
  console.log('Root folders:', folders);
  
  return <div>...</div>;
}
```

### Create a Folder

```typescript
// Create a root folder
const newFolder = await createFolder('My Reports', null);

// Create a subfolder
const subfolder = await createFolder('2024', parentFolderId);
```

### Upload a File

```typescript
// From file input
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const uploadedFile = await uploadFile(file, folderId); // folderId can be null for root
    console.log('File uploaded:', uploadedFile);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Download a File

```typescript
// Download a file record
await downloadFile(fileRecord);
// This will trigger a browser download
```

### Delete a File

```typescript
await deleteFile(fileRecord.id, fileRecord.storage_path);
```

### Move a File to Another Folder

```typescript
await moveFile(fileId, newFolderId);
```

### Get Files in a Specific Folder

```typescript
const files = await getFilesInFolder(folderId); // null for root
console.log('Files:', files);
```

---

## AI Assistant

### Making an AI Request (Privacy-Safe)

```typescript
import { makeAIRequest, extractSafeSchema } from '@/lib/ai/waterfall';

// Extract schema from your spreadsheet (NO DATA!)
const schema = extractSafeSchema(
  ['Revenue', 'Cost', 'Profit'], // Headers only
  [10000, 6000, 4000] // First row for type inference (optional)
);

// Make AI request
const response = await makeAIRequest(
  'Calculate profit margin as a percentage', // User's question
  schema
);

if (response.success) {
  console.log('Formula:', response.code);
  console.log('Provider:', response.provider);
  console.log('Explanation:', response.explanation);
  
  // Apply the formula client-side to your actual data
  // Example: response.code might be "=(C2/A2)*100"
} else {
  console.error('AI Error:', response.error);
}
```

### Extract Safe Schema from Spreadsheet

```typescript
import { extractSafeSchema } from '@/lib/ai/waterfall';

// From your spreadsheet data
const headers = ['Name', 'Age', 'Salary', 'Department'];
const firstRow = ['John', 25, 50000, 'Engineering'];

const schema = extractSafeSchema(headers, firstRow);

console.log(schema);
// Output:
// {
//   headers: ['Name', 'Age', 'Salary', 'Department'],
//   columnTypes: {
//     'Name': 'string',
//     'Age': 'number',
//     'Salary': 'number',
//     'Department': 'string'
//   }
// }
// Note: NO actual data values are included!
```

### Understanding AI Response Types

```typescript
if (response.type === 'formula') {
  // Excel formula (e.g., "=SUM(A1:A10)")
  applyExcelFormula(response.code);
} else if (response.type === 'transformation') {
  // JavaScript function (e.g., "row.Total = row.Price * row.Quantity")
  applyJavaScriptTransform(response.code);
} else {
  // Error
  showError(response.error);
}
```

---

## Database Queries

### Direct Database Access (Advanced)

```typescript
import { supabase } from '@/lib/supabase/client';

// Query folders
const { data: folders, error } = await supabase
  .from('folders')
  .select('*')
  .eq('parent_id', null) // Root folders only
  .order('name');

// Query files in a folder
const { data: files } = await supabase
  .from('files')
  .select('*')
  .eq('folder_id', folderId)
  .order('created_at', { ascending: false });

// Create a folder
const { data: newFolder, error: insertError } = await supabase
  .from('folders')
  .insert({
    name: 'My Folder',
    parent_id: null,
    user_id: userId,
  })
  .select()
  .single();

// Update a file
const { error: updateError } = await supabase
  .from('files')
  .update({ name: 'New Name.xlsx' })
  .eq('id', fileId);

// Delete a folder (cascades to children)
const { error: deleteError } = await supabase
  .from('folders')
  .delete()
  .eq('id', folderId);
```

### Storage Operations

```typescript
import { supabase } from '@/lib/supabase/client';

// Upload file to storage
const { data, error } = await supabase.storage
  .from('spreadsheets')
  .upload('user-id/timestamp_filename.xlsx', file, {
    cacheControl: '3600',
    upsert: false,
  });

// Download file from storage
const { data: blob, error: downloadError } = await supabase.storage
  .from('spreadsheets')
  .download('user-id/timestamp_filename.xlsx');

// Delete file from storage
const { error: deleteError } = await supabase.storage
  .from('spreadsheets')
  .remove(['user-id/timestamp_filename.xlsx']);

// Get public URL (if bucket is public)
const { data: urlData } = supabase.storage
  .from('spreadsheets')
  .getPublicUrl('user-id/timestamp_filename.xlsx');
```

---

## TypeScript Types

### Using Database Types

```typescript
import { Database } from '@/lib/supabase/database.types';

type Folder = Database['public']['Tables']['folders']['Row'];
type File = Database['public']['Tables']['files']['Row'];
type FolderInsert = Database['public']['Tables']['folders']['Insert'];
type FileUpdate = Database['public']['Tables']['files']['Update'];

// Use in your functions
function processFolder(folder: Folder) {
  console.log(folder.name, folder.created_at);
}
```

### AI Types

```typescript
import { AIResponse, SpreadsheetSchema } from '@/types/ai';

const schema: SpreadsheetSchema = {
  headers: ['Col1', 'Col2'],
  columnTypes: { 'Col1': 'number', 'Col2': 'string' },
};

const handleAIResponse = (response: AIResponse) => {
  if (response.success) {
    console.log('Code:', response.code);
  }
};
```

---

## Common Patterns

### Protected Component (Requires Auth)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/supabase/client';

export default function ProtectedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  if (loading) return <div>Loading...</div>;

  return <div>Protected content</div>;
}
```

### Real-time Subscriptions

```typescript
import { supabase } from '@/lib/supabase/client';

// Listen for new files
const subscription = supabase
  .channel('files-channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'files',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      console.log('New file added:', payload.new);
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

---

## Error Handling

### Best Practices

```typescript
try {
  const { data, error } = await supabase
    .from('folders')
    .select('*');

  if (error) throw error;

  // Handle data
  console.log(data);
} catch (error: any) {
  if (error.code === 'PGRST116') {
    console.error('RLS policy violation');
  } else if (error.code === '23505') {
    console.error('Duplicate entry');
  } else {
    console.error('Database error:', error.message);
  }
}
```

---

## Security Notes

1. **Never expose service role key** in client-side code
2. **Always validate user input** before database operations
3. **RLS policies are enforced** at database level (cannot be bypassed from client)
4. **AI requests are safe** - only headers sent, never actual data
5. **File paths include user ID** - ensures storage isolation

---

**For more details, see:**
- [README.md](./README.md) - Full architecture overview
- [SETUP.md](./SETUP.md) - Complete setup instructions
- [MIGRATION.md](./MIGRATION.md) - Migration details
