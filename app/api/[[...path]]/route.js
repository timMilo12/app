import { NextResponse } from 'next/server'
import { supabase, getFileUrl } from '../../../lib/supabase'
import { generateTextRecordName } from '../../../lib/openai'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Helper function to handle errors
const handleError = (error, message = 'Internal server error') => {
  console.error(message, error)
  return NextResponse.json({ error: message }, { status: 500 })
}

// API Router
export async function GET(request) {
  const { searchParams, pathname } = new URL(request.url)
  const path = pathname.replace('/api/', '')

  try {
    // Get workspace by name
    if (path === 'workspace') {
      const name = searchParams.get('name')
      if (!name) {
        return NextResponse.json({ error: 'Workspace name required' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, createdAt')
        .eq('name', name)
        .single()

      if (error) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }

      return NextResponse.json(data)
    }

    // Get workspace contents
    if (path === 'workspace/contents') {
      const workspaceId = searchParams.get('workspaceId')
      const folderId = searchParams.get('folderId') || null

      if (!workspaceId) {
        return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 })
      }

      // Get folders
      const { data: folders, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('workspaceId', workspaceId)
        .eq('parentFolderId', folderId)
        .order('createdAt', { ascending: false })

      // Get text records
      const { data: textRecords, error: textError } = await supabase
        .from('text_records')
        .select('*')
        .eq('workspaceId', workspaceId)
        .eq('folderId', folderId)
        .order('createdAt', { ascending: false })

      // Get files
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('workspaceId', workspaceId)
        .eq('folderId', folderId)
        .order('createdAt', { ascending: false })

      if (foldersError || textError || filesError) {
        return handleError(foldersError || textError || filesError, 'Failed to fetch contents')
      }

      // Add public URLs to files
      const filesWithUrls = files.map(file => ({
        ...file,
        url: getFileUrl(file.file_path)
      }))

      return NextResponse.json({
        folders: folders || [],
        textRecords: textRecords || [],
        files: filesWithUrls || []
      })
    }

    // Get folder breadcrumb
    if (path === 'folder/breadcrumb') {
      const folderId = searchParams.get('folderId')
      if (!folderId) {
        return NextResponse.json([])
      }

      const breadcrumb = []
      let currentFolderId = folderId

      while (currentFolderId) {
        const { data: folder, error } = await supabase
          .from('folders')
          .select('*')
          .eq('id', currentFolderId)
          .single()

        if (error || !folder) break

        breadcrumb.unshift(folder)
        currentFolderId = folder.parentFolderId
      }

      return NextResponse.json(breadcrumb)
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request) {
  const { pathname } = new URL(request.url)
  const path = pathname.replace('/api/', '')
  const body = await request.json()

  try {
    // Create workspace
    if (path === 'workspace/create') {
      const { name, password } = body

      if (!name || !password) {
        return NextResponse.json({ error: 'Name and password required' }, { status: 400 })
      }

      // Check if workspace exists
      const { data: existing } = await supabase
        .from('workspaces')
        .select('id')
        .eq('name', name)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Workspace name already exists' }, { status: 400 })
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10)

      // Create workspace
      const { data, error } = await supabase
        .from('workspaces')
        .insert([{
          id: uuidv4(),
          name,
          password_hash: passwordHash
        }])
        .select()
        .single()

      if (error) {
        return handleError(error, 'Failed to create workspace')
      }

      return NextResponse.json({ id: data.id, name: data.name })
    }

    // Access workspace
    if (path === 'workspace/access') {
      const { name, password } = body

      if (!name || !password) {
        return NextResponse.json({ error: 'Name and password required' }, { status: 400 })
      }

      // Get workspace
      const { data: workspace, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('name', name)
        .single()

      if (error || !workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, workspace.password_hash)

      if (!passwordMatch) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }

      return NextResponse.json({ id: workspace.id, name: workspace.name })
    }

    // Create folder
    if (path === 'folder/create') {
      const { workspaceId, parentFolderId, name } = body

      if (!workspaceId || !name) {
        return NextResponse.json({ error: 'Workspace ID and name required' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('folders')
        .insert([{
          id: uuidv4(),
          workspaceId,
          parentFolderId: parentFolderId || null,
          name
        }])
        .select()
        .single()

      if (error) {
        return handleError(error, 'Failed to create folder')
      }

      return NextResponse.json(data)
    }

    // Create text record
    if (path === 'text/create') {
      const { workspaceId, folderId, content } = body

      if (!workspaceId || !content) {
        return NextResponse.json({ error: 'Workspace ID and content required' }, { status: 400 })
      }

      // Generate AI name
      const aiName = await generateTextRecordName(content)

      const { data, error } = await supabase
        .from('text_records')
        .insert([{
          id: uuidv4(),
          workspaceId,
          folderId: folderId || null,
          name: aiName,
          content
        }])
        .select()
        .single()

      if (error) {
        return handleError(error, 'Failed to create text record')
      }

      return NextResponse.json(data)
    }

    // Upload file
    if (path === 'file/upload') {
      const { workspaceId, folderId, fileName, fileData, mimeType, size } = body

      if (!workspaceId || !fileName || !fileData) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // Decode base64
      const buffer = Buffer.from(fileData, 'base64')
      const filePath = `${workspaceId}/${uuidv4()}_${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('workspace-files')
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: false
        })

      if (uploadError) {
        return handleError(uploadError, 'Failed to upload file')
      }

      // Save file metadata
      const { data, error } = await supabase
        .from('files')
        .insert([{
          id: uuidv4(),
          workspaceId,
          folderId: folderId || null,
          name: fileName,
          file_path: uploadData.path,
          size: size || buffer.length,
          mime_type: mimeType
        }])
        .select()
        .single()

      if (error) {
        return handleError(error, 'Failed to save file metadata')
      }

      return NextResponse.json({
        ...data,
        url: getFileUrl(data.file_path)
      })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request) {
  const { pathname } = new URL(request.url)
  const path = pathname.replace('/api/', '')
  const { searchParams } = new URL(request.url)

  try {
    // Delete folder
    if (path === 'folder/delete') {
      const id = searchParams.get('id')
      if (!id) {
        return NextResponse.json({ error: 'Folder ID required' }, { status: 400 })
      }

      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id)

      if (error) {
        return handleError(error, 'Failed to delete folder')
      }

      return NextResponse.json({ success: true })
    }

    // Delete text record
    if (path === 'text/delete') {
      const id = searchParams.get('id')
      if (!id) {
        return NextResponse.json({ error: 'Text record ID required' }, { status: 400 })
      }

      const { error } = await supabase
        .from('text_records')
        .delete()
        .eq('id', id)

      if (error) {
        return handleError(error, 'Failed to delete text record')
      }

      return NextResponse.json({ success: true })
    }

    // Delete file
    if (path === 'file/delete') {
      const id = searchParams.get('id')
      if (!id) {
        return NextResponse.json({ error: 'File ID required' }, { status: 400 })
      }

      // Get file data
      const { data: file, error: fetchError } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !file) {
        return handleError(fetchError, 'File not found')
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('workspace-files')
        .remove([file.file_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
      }

      // Delete metadata
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id)

      if (error) {
        return handleError(error, 'Failed to delete file')
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT() {
  return NextResponse.json({ message: 'the-CloudSpace API' })
}

export async function PATCH() {
  return NextResponse.json({ message: 'the-CloudSpace API' })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, DELETE, PUT, PATCH, HEAD, OPTIONS'
    }
  })
}