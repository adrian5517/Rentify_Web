// Frontend upload helpers
// Provides robust helpers to upload files and update profile picture

import config from './config'

const API_BASE = (config.API_API || '').replace(/\/$/, '')

export async function uploadFiles(files: File[], token?: string) {
  if (!files || files.length === 0) throw new Error('No files provided')
  const url = `${API_BASE || ''}/api/upload`
  const fd = new FormData()
  files.forEach(f => fd.append('files', f))

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { method: 'POST', headers, body: fd })
  const contentType = res.headers.get('content-type') || ''
  let data: any
  if (contentType.includes('application/json')) data = await res.json()
  else data = { message: await res.text() }

  if (!res.ok) throw new Error(data?.message || `Upload failed (${res.status})`)
  return data
}

export async function uploadProfilePicture(file: File, token: string | undefined, userId: string) {
  if (!file) throw new Error('No file provided')
  if (!userId) throw new Error('User ID required')

  const BASE = API_BASE || ''
  const putUrl = `${BASE}/api/auth/users/${userId}/profile-picture`

  // Try single-step: PUT multipart to profile-picture endpoint (some servers accept this)
  try {
    const fd = new FormData()
    fd.append('file', file)
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(putUrl, { method: 'PUT', headers, body: fd })
    const contentType = res.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await res.json() : { message: await res.text() }

    if (res.ok && data && (data.success || data.user)) {
      return data
    }
    // otherwise fall through to two-step
  } catch (err) {
    // ignore and try fallback
    console.warn('Single-step profile PUT failed, falling back to two-step upload:', err)
  }

  // Fallback: upload to /api/upload then call PUT with JSON { imageUrl }
  const uploadResult = await uploadFiles([file], token)
  // DEBUG: log the upload result so frontend can be verified against profile update
  console.log('DEBUG uploadResult for profile update:', uploadResult)
  const fileUrl = uploadResult.fileUrl || (uploadResult.files && uploadResult.files[0] && (uploadResult.files[0].url || uploadResult.files[0].fileUrl))
  if (!fileUrl) throw new Error('Upload succeeded but no fileUrl returned')

  const updateHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) updateHeaders['Authorization'] = `Bearer ${token}`

  const updateRes = await fetch(putUrl, {
    method: 'PUT',
    headers: updateHeaders,
    body: JSON.stringify({ imageUrl: fileUrl })
  })

  const updateContentType = updateRes.headers.get('content-type') || ''
  const updateData = updateContentType.includes('application/json') ? await updateRes.json() : { message: await updateRes.text() }
  if (!updateRes.ok || !updateData.success) throw new Error(updateData?.message || `Failed to update profile (${updateRes.status})`)
  return updateData
}
