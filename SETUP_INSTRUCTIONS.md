# the-CloudSpace Setup Instructions

## 🚀 Database Setup (IMPORTANT - Do this first!)

Before the application will work, you need to set up your Supabase database.

### Step 1: Run the SQL Schema

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Copy the entire content from `SUPABASE_SETUP.sql` file
5. Paste it into the SQL editor
6. Click **Run** button

This will create:
- All required tables (workspaces, folders, text_records, files)
- Proper indexes for performance
- Row Level Security policies
- Storage bucket for file uploads

### Step 2: Verify Installation

After running the SQL:
1. Go to **Table Editor** in Supabase dashboard
2. You should see 4 tables: `workspaces`, `folders`, `text_records`, and `files`
3. Go to **Storage** and verify the `workspace-files` bucket exists

### Step 3: Start Using the-CloudSpace

Once the database is set up, the application is ready to use!

---

## 🎨 Features

- **No Accounts Required**: Create workspaces with just a name and password
- **File Sharing**: Upload any type of file (images, documents, videos, etc.)
- **Text Records**: Create text notes with AI-generated names
- **Folders**: Organize your files and text records
- **Recently Accessed**: Quick access to your 5 most recent workspaces (5-day retention)
- **Beautiful Glassmorphism Design**: Modern, sleek black theme with frosted glass effects
- **No Auto-Expiry**: Your data stays until you delete it

---

## 💡 How to Use

### Creating a Workspace:
1. Enter a unique workspace name
2. Set a password
3. Click "Create Workspace"

### Accessing a Workspace:
1. Enter the workspace name
2. Enter the correct password
3. Click "Access Workspace"

### Inside a Workspace:
- **Upload Files**: Click the upload button to add files
- **Create Text Records**: Write text content and AI will generate a descriptive name
- **Create Folders**: Organize your content with folders
- **Copy Text**: Click copy button on any text record
- **Delete**: Remove files, text records, or folders as needed

---

## 🔒 Security Note

Workspace passwords are hashed and securely stored. Make sure to remember your password as there's no recovery option (by design for privacy).

---

## 🛠️ Tech Stack

- **Frontend**: Next.js with Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-4o with Emergent LLM key

---

## 📝 Environment Variables

All environment variables are already configured in `.env`:
- Supabase URL and Anon Key
- Emergent LLM Key for AI naming
- Base URL for the application

---

Enjoy using **the-CloudSpace**! 🚀☁️
