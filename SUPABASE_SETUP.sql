-- the-CloudSpace Database Schema Setup
-- Run this SQL in your Supabase SQL Editor

-- Drop existing tables if recreating
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS text_records CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;

-- Create workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create folders table
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "parentFolderId" UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create text_records table
CREATE TABLE text_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "folderId" UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspaceId" UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  "folderId" UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_folders_workspace ON folders("workspaceId");
CREATE INDEX idx_folders_parent ON folders("parentFolderId");
CREATE INDEX idx_text_records_workspace ON text_records("workspaceId");
CREATE INDEX idx_text_records_folder ON text_records("folderId");
CREATE INDEX idx_files_workspace ON files("workspaceId");
CREATE INDEX idx_files_folder ON files("folderId");

-- Enable Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we're handling auth in app)
CREATE POLICY "Allow all operations" ON workspaces FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON folders FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON text_records FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON files FOR ALL USING (true);

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-files', 'workspace-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy
CREATE POLICY "Allow public access to workspace files"
ON storage.objects FOR ALL
USING (bucket_id = 'workspace-files');