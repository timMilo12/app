'use client'

import { useState, useEffect } from 'react'
import { Upload, FolderPlus, FileText, Folder, File, Trash2, Copy, Home, ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function CloudSpace() {
  const [currentWorkspace, setCurrentWorkspace] = useState(null)
  const [currentFolder, setCurrentFolder] = useState(null)
  const [breadcrumb, setBreadcrumb] = useState([])
  const [contents, setContents] = useState({ folders: [], textRecords: [], files: [] })
  const [recentWorkspaces, setRecentWorkspaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(null)
  
  // Dialog states
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspacePassword, setWorkspacePassword] = useState('')
  const [folderName, setFolderName] = useState('')
  const [textContent, setTextContent] = useState('')
  const [uploading, setUploading] = useState(false)

  // Load recent workspaces from localStorage
  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recentWorkspaces') || '[]')
    const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000)
    const filtered = recent.filter(w => w.timestamp > fiveDaysAgo)
    setRecentWorkspaces(filtered)
    localStorage.setItem('recentWorkspaces', JSON.stringify(filtered))
  }, [])

  // Load workspace contents
  useEffect(() => {
    if (currentWorkspace) {
      loadContents()
      loadBreadcrumb()
    }
  }, [currentWorkspace, currentFolder])

  const loadContents = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workspace/contents?workspaceId=${currentWorkspace.id}&folderId=${currentFolder || ''}`)
      const data = await res.json()
      setContents(data)
    } catch (error) {
      console.error('Failed to load contents:', error)
    }
    setLoading(false)
  }

  const loadBreadcrumb = async () => {
    if (!currentFolder) {
      setBreadcrumb([])
      return
    }
    try {
      const res = await fetch(`/api/folder/breadcrumb?folderId=${currentFolder}`)
      const data = await res.json()
      setBreadcrumb(data)
    } catch (error) {
      console.error('Failed to load breadcrumb:', error)
    }
  }

  const addToRecentWorkspaces = (workspace) => {
    const recent = JSON.parse(localStorage.getItem('recentWorkspaces') || '[]')
    const filtered = recent.filter(w => w.id !== workspace.id)
    filtered.unshift({ ...workspace, timestamp: Date.now() })
    const limited = filtered.slice(0, 10)
    localStorage.setItem('recentWorkspaces', JSON.stringify(limited))
    setRecentWorkspaces(limited)
  }

  const handleCreateWorkspace = async () => {
    if (!workspaceName || !workspacePassword) return
    setLoading(true)
    try {
      const res = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName, password: workspacePassword })
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentWorkspace(data)
        addToRecentWorkspaces(data)
        setWorkspaceName('')
        setWorkspacePassword('')
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to create workspace')
    }
    setLoading(false)
  }

  const handleAccessWorkspace = async () => {
    if (!workspaceName || !workspacePassword) return
    setLoading(true)
    try {
      const res = await fetch('/api/workspace/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName, password: workspacePassword })
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentWorkspace(data)
        addToRecentWorkspaces(data)
        setWorkspaceName('')
        setWorkspacePassword('')
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Failed to access workspace')
    }
    setLoading(false)
  }

  const handleCreateFolder = async () => {
    if (!folderName) return
    setLoading(true)
    try {
      const res = await fetch('/api/folder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          parentFolderId: currentFolder,
          name: folderName
        })
      })
      if (res.ok) {
        setFolderName('')
        loadContents()
      }
    } catch (error) {
      alert('Failed to create folder')
    }
    setLoading(false)
  }

  const handleCreateText = async () => {
    if (!textContent) return
    setLoading(true)
    try {
      const res = await fetch('/api/text/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          folderId: currentFolder,
          content: textContent
        })
      })
      if (res.ok) {
        setTextContent('')
        loadContents()
      }
    } catch (error) {
      alert('Failed to create text record')
    }
    setLoading(false)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1]
        const res = await fetch('/api/file/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
            folderId: currentFolder,
            fileName: file.name,
            fileData: base64,
            mimeType: file.type,
            size: file.size
          })
        })
        if (res.ok) {
          loadContents()
        } else {
          alert('Failed to upload file')
        }
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      alert('Failed to upload file')
      setUploading(false)
    }
  }

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/${type}/delete?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadContents()
      }
    } catch (error) {
      alert('Failed to delete item')
    }
    setLoading(false)
  }

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Logo and Title */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img src="https://customer-assets.emergentagent.com/job_597557a2-129a-4a78-9f6d-2a3c2f44042e/artifacts/mfnvpkm4_Unbenannt.png" alt="the-CloudSpace" className="h-24 w-24 object-contain" />
            </div>
            <h1 className="text-5xl font-bold text-white">the-CloudSpace</h1>
            <p className="text-gray-300">Share files and text without accounts</p>
          </div>

          {/* Glassmorphism Card */}
          <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-8 shadow-2xl">
            <Tabs defaultValue="access" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/5 backdrop-blur-sm">
                <TabsTrigger value="access" className="data-[state=active]:bg-white/20">Access Workspace</TabsTrigger>
                <TabsTrigger value="create" className="data-[state=active]:bg-white/20">Create Workspace</TabsTrigger>
              </TabsList>
              
              <TabsContent value="access" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label className="text-white">Workspace Name</Label>
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name"
                    className="bg-white/10 border-white/30 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Password</Label>
                  <Input
                    type="password"
                    value={workspacePassword}
                    onChange={(e) => setWorkspacePassword(e.target.value)}
                    placeholder="Enter password"
                    className="bg-white/10 border-white/30 text-white placeholder:text-gray-400"
                  />
                </div>
                <Button onClick={handleAccessWorkspace} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">
                  {loading ? 'Accessing...' : 'Access Workspace'}
                </Button>
              </TabsContent>
              
              <TabsContent value="create" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label className="text-white">Workspace Name</Label>
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Choose a unique name"
                    className="bg-white/10 border-white/30 text-white placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Password</Label>
                  <Input
                    type="password"
                    value={workspacePassword}
                    onChange={(e) => setWorkspacePassword(e.target.value)}
                    placeholder="Create a secure password"
                    className="bg-white/10 border-white/30 text-white placeholder:text-gray-400"
                  />
                </div>
                <Button onClick={handleCreateWorkspace} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                  {loading ? 'Creating...' : 'Create Workspace'}
                </Button>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Recent Workspaces */}
          {recentWorkspaces.length > 0 && (
            <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6 shadow-2xl">
              <h2 className="text-xl font-semibold text-white mb-4">Recently Accessed</h2>
              <div className="space-y-2">
                {recentWorkspaces.map(ws => (
                  <div key={ws.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                    <span className="text-white">{ws.name}</span>
                    <span className="text-xs text-gray-400">{new Date(ws.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="https://customer-assets.emergentagent.com/job_597557a2-129a-4a78-9f6d-2a3c2f44042e/artifacts/mfnvpkm4_Unbenannt.png" alt="Logo" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-white">{currentWorkspace.name}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Home className="h-4 w-4" />
                  {breadcrumb.map((folder, i) => (
                    <span key={folder.id}>
                      <span className="mx-1">/</span>
                      <button onClick={() => setCurrentFolder(folder.id)} className="hover:text-white">
                        {folder.name}
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={() => { setCurrentWorkspace(null); setCurrentFolder(null) }} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </div>
        </Card>

        {/* Actions */}
        <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6 shadow-2xl">
          <div className="flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-white/20 text-white">
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Folder Name</Label>
                    <Input
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="Enter folder name"
                      className="bg-white/10 border-white/30 text-white"
                    />
                  </div>
                  <Button onClick={handleCreateFolder} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <FileText className="h-4 w-4 mr-2" />
                  New Text
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-white/20 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Text Record</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Enter your text..."
                      rows={8}
                      className="bg-white/10 border-white/30 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-2">AI will generate a descriptive name for this text</p>
                  </div>
                  <Button onClick={handleCreateText} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                    {loading ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button className="bg-purple-600 hover:bg-purple-700" disabled={uploading} onClick={() => document.getElementById('file-upload').click()}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </Card>

        {/* Contents */}
        <div className="grid gap-4">
          {/* Folders */}
          {contents.folders.map(folder => (
            <Card key={folder.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl hover:bg-white/15 transition-all cursor-pointer" onClick={() => setCurrentFolder(folder.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Folder className="h-6 w-6 text-yellow-400" />
                  <div>
                    <h3 className="font-medium text-white">{folder.name}</h3>
                    <p className="text-sm text-gray-400">{new Date(folder.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/20" onClick={(e) => { e.stopPropagation(); handleDelete('folder', folder.id) }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          {/* Text Records */}
          {contents.textRecords.map(text => (
            <Card key={text.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl hover:bg-white/15 transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-400" />
                    <div>
                      <h3 className="font-medium text-white">{text.name}</h3>
                      <p className="text-sm text-gray-400">{new Date(text.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-green-500/20" onClick={() => handleCopyText(text.content, text.id)}>
                      {copied === text.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/20" onClick={() => handleDelete('text', text.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-gray-300 text-sm bg-black/20 p-3 rounded-lg">{text.content}</p>
              </div>
            </Card>
          ))}

          {/* Files */}
          {contents.files.map(file => (
            <Card key={file.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-xl hover:bg-white/15 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="h-6 w-6 text-purple-400" />
                  <div>
                    <h3 className="font-medium text-white">{file.name}</h3>
                    <p className="text-sm text-gray-400">{formatFileSize(file.size)} · {new Date(file.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20" onClick={() => window.open(file.url, '_blank')}>
                    View
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/20" onClick={() => handleDelete('file', file.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {loading && (
          <div className="text-center text-white py-8">
            <p>Loading...</p>
          </div>
        )}

        {!loading && contents.folders.length === 0 && contents.textRecords.length === 0 && contents.files.length === 0 && (
          <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-12 shadow-xl text-center">
            <p className="text-gray-400 text-lg">This workspace is empty. Start by creating a folder, adding text, or uploading a file.</p>
          </Card>
        )}
      </div>
    </div>
  )
}