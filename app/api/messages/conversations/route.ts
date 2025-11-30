import { NextResponse } from 'next/server'

const REMOTE_API_BASE = 'https://rentify-server-ge0f.onrender.com/api'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const skip = parseInt(url.searchParams.get('skip') || '0', 10)

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId query param' }, { status: 400 })
    }

    // Forward the Authorization header if present
    const authHeader = req.headers.get('authorization') || ''
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authHeader) headers['Authorization'] = authHeader

    // Fetch users from remote API
    const usersRes = await fetch(`${REMOTE_API_BASE}/auth/users`, { headers })
    if (!usersRes.ok) {
      const text = await usersRes.text()
      return NextResponse.json({ error: 'Failed to fetch users', detail: text }, { status: 502 })
    }

    const usersData = await usersRes.json()
    const users = usersData.users || usersData || []

    // Filter out current user
    const otherUsers = Array.isArray(users)
      ? users.filter((u: any) => {
          const id = u._id || u.id
          return id && id !== userId
        })
      : []

    // For each other user, fetch messages between current user and them
    const pairs = otherUsers.map((u: any) => ({ participant: u, id: u._1 || u._id || u.id }))

    const fetchPromises = pairs.map(async ({ participant, id }) => {
      try {
        const res = await fetch(`${REMOTE_API_BASE}/messages/${userId}/${id}`, { headers })
        if (!res.ok) {
          // If not found, return empty
          return { participant, messages: [] }
        }
        const data = await res.json()
        return { participant, messages: Array.isArray(data) ? data : [] }
      } catch (err) {
        return { participant, messages: [] }
      }
    })

    const results = await Promise.all(fetchPromises)

    // Build conversation summaries
    const convos = results
      .filter(r => r.messages && r.messages.length > 0)
      .map(r => {
        const msgs = r.messages
        const lastMessage = msgs[msgs.length - 1]
        const unreadCount = msgs.reduce((acc: number, m: any) => acc + ((m.receiver === userId && !m.read) ? 1 : 0), 0)
        return {
          participant: {
            _id: r.participant._id || r.participant.id,
            username: r.participant.username,
            name: r.participant.name || r.participant.fullName,
            email: r.participant.email,
            profilePicture: r.participant.profilePicture,
            online: r.participant.online || false,
          },
          lastMessage,
          unreadCount,
          totalMessages: msgs.length,
          lastMessageAt: lastMessage?.createdAt || null,
        }
      })

    // Sort by lastMessageAt desc
    convos.sort((a, b) => (new Date(b.lastMessageAt || 0).getTime()) - (new Date(a.lastMessageAt || 0).getTime()))

    // Apply pagination
    const start = Math.max(0, skip)
    const end = start + Math.max(0, Math.min(limit, 100))
    const page = convos.slice(start, end)

    return NextResponse.json(page)
  } catch (err) {
    console.error('Error in local conversations route', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
