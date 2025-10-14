"use client"

import { useState, useEffect, useRef } from "react"
import { Search, MoreVertical, Phone, MessageCircle, Send, Paperclip, Smile, Check, X, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  initializeSocket, 
  disconnectSocket, 
  getSocket
} from "@/lib/socket"
import { 
  fetchUsers,
  fetchMessages,
  sendMessageAPI,
  deleteMessage,
  type MessageData
} from "@/lib/api"

function MessagesPage() {
  // Enhanced message type with MongoDB structure
  type Message = MessageData & {
    fromMe?: boolean
    time?: string
    reactions?: { emoji: string; count: number }[]
    type?: 'text' | 'image'
  }

  type Contact = {
    id: string
    name: string
    avatar: string
    profilePicture?: string // URL to profile picture
    unread: number
    online: boolean
    lastSeen?: string
    typing?: boolean
    lastMessageTime?: number // Timestamp of the last message
  }

  // Get current user from localStorage (Zustand auth store structure)
  const [currentUser, setCurrentUser] = useState<{ _id: string; username: string; name?: string; email: string; profilePicture?: string } | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true) // For initial page load
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false) // Track if data has been loaded
  const [loadedConversations, setLoadedConversations] = useState<Set<string>>(new Set()) // Track loaded conversations
  const [messageCache, setMessageCache] = useState<Map<string, Message[]>>(new Map()) // Cache messages per contact

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize current user and socket connection
  useEffect(() => {
    console.log('🔵 MessagesPage component mounted')
    
    // Get auth data from Zustand store (stored as 'auth-storage')
    const authStorageData = localStorage.getItem("auth-storage")
    console.log('🔍 Auth storage data:', authStorageData)
    
    if (authStorageData) {
      const authStore = JSON.parse(authStorageData)
      const user = authStore.state?.user
      
      console.log('👤 Current user from auth store:', user)
      
      if (user && user._id) {
        setCurrentUser(user)
        
        // Initialize WebSocket connection with user._id
        console.log('🚀 Initializing socket with user ID:', user._id)
        const socket = initializeSocket(user._id)
        setIsConnected(true)

        // Listen for incoming messages
        socket.on('private-message', (newMessage: MessageData) => {
          console.log('📩 Received new message:', newMessage)
          
          const formattedMessage: Message = {
            ...newMessage,
            fromMe: newMessage.sender === user._id,
            time: 'now',
            type: (newMessage.imageUrls && newMessage.imageUrls.length > 0 ? 'image' : 'text') as 'image' | 'text'
          }

          // Determine which contact this message belongs to
          const contactId = newMessage.sender === user._id ? newMessage.receiver : newMessage.sender
          
          // Update cache for this contact
          setMessageCache(prev => {
            const newCache = new Map(prev)
            const contactMessages = newCache.get(contactId) || []
            newCache.set(contactId, [...contactMessages, formattedMessage])
            return newCache
          })

          // Update messages if the message is from the selected contact
          if (selectedContact && 
              (newMessage.sender === selectedContact || newMessage.receiver === selectedContact)) {
            setMessages(prev => [...prev, formattedMessage])
          }
          
          // Update contact's unread count and lastMessageTime, then sort by latest message
          setContacts(prev => {
            const senderId = newMessage.sender
            const existingContact = prev.find(c => c.id === senderId)
            
            // If contact doesn't exist and message is from someone else, add them
            if (!existingContact && senderId !== user._id) {
              // Fetch user info and add to contacts
              fetchUsers().then(users => {
                const sender = users.find(u => u._id === senderId)
                if (sender) {
                  const displayName = sender.fullName || sender.name || sender.username || sender.email
                  const newContact: Contact = {
                    id: sender._id,
                    name: displayName,
                    avatar: displayName.charAt(0).toUpperCase(),
                    profilePicture: sender.profilePicture, // Add profile picture
                    unread: selectedContact !== senderId ? 1 : 0,
                    online: false,
                    lastSeen: "Recently",
                    lastMessageTime: Date.now()
                  }
                  setContacts(prevContacts => {
                    const updated = [...prevContacts, newContact]
                    return updated.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
                  })
                }
              })
              return prev
            }
            
            // Update existing contacts
            const updatedContacts = prev.map(contact => {
              if (contact.id === senderId && selectedContact !== senderId) {
                return { ...contact, unread: contact.unread + 1, lastMessageTime: Date.now() }
              }
              if (contact.id === senderId || contact.id === newMessage.receiver) {
                return { ...contact, lastMessageTime: Date.now() }
              }
              return contact
            })
            // Sort contacts by lastMessageTime (most recent first)
            return updatedContacts.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
          })
        })

        // Listen for typing indicators
        socket.on('typing-start', ({ senderId }: { senderId: string }) => {
          console.log('⌨️ User is typing:', senderId)
          setContacts(prev => prev.map(contact => 
            contact.id === senderId ? { ...contact, typing: true } : contact
          ))
        })

        socket.on('typing-stop', ({ senderId }: { senderId: string }) => {
          console.log('✋ User stopped typing:', senderId)
          setContacts(prev => prev.map(contact => 
            contact.id === senderId ? { ...contact, typing: false } : contact
          ))
        })

        // Listen for read receipts
        socket.on('messages-read', ({ readBy, count }: { readBy: string; count: number }) => {
          console.log(`✓✓ ${count} messages marked as read by:`, readBy)
          
          // Update cache for this contact
          setMessageCache(prev => {
            const newCache = new Map(prev)
            const contactMessages = newCache.get(readBy)
            if (contactMessages) {
              const updatedMessages = contactMessages.map(msg => 
                msg.fromMe && msg.receiver === readBy ? { ...msg, read: true } : msg
              )
              newCache.set(readBy, updatedMessages)
            }
            return newCache
          })

          // Update all messages from the current user to the readBy user as read
          setMessages(prev => prev.map(msg => 
            msg.fromMe && msg.receiver === readBy ? { ...msg, read: true } : msg
          ))
        })

        return () => {
          console.log('🔴 MessagesPage unmounting - disconnecting socket')
          disconnectSocket()
          setIsConnected(false)
        }
      } else {
        console.log('⚠️ User data incomplete - missing user or user._id')
      }
    } else {
      console.log('⚠️ No auth-storage data found in localStorage - user not logged in')
    }
  }, []) // Remove selectedContact from dependency array

  // Fetch contacts and check which ones have conversations
  useEffect(() => {
    // Skip if already loaded once
    if (hasLoadedOnce) {
      console.log('⏭️ Skipping contacts fetch - already loaded once')
      setIsInitialLoading(false)
      return
    }

    if (currentUser) {
      console.log('🔍 Fetching contacts/users...')
      setIsInitialLoading(true) // Start loading
      
      // Try to fetch real users from backend
      fetchUsers()
        .then(async (users) => {
          if (users && users.length > 0) {
            console.log('✅ Fetched users from backend:', users)
            console.log('📋 Sample user data:', users[0]) // Log first user to see structure
            
            // Filter out current user
            const otherUsers = users.filter(user => user._id !== currentUser._id)
            
            // Check which users have conversations with the current user
            const contactsWithMessages: Contact[] = []
            
            for (const user of otherUsers) {
              try {
                // Fetch messages for this user
                const messages = await fetchMessages(currentUser._id, user._id)
                
                // Only add to contacts if there are messages
                if (messages && messages.length > 0) {
                  const displayName = user.fullName || user.name || user.username || user.email
                  const latestMessage = messages[messages.length - 1]
                  const lastMessageTime = new Date(latestMessage.createdAt).getTime()
                  
                  contactsWithMessages.push({
                    id: user._id,
                    name: displayName,
                    avatar: displayName.charAt(0).toUpperCase(),
                    profilePicture: user.profilePicture, // Add profile picture from user data
                    unread: 0,
                    online: false,
                    lastSeen: "Recently",
                    lastMessageTime
                  })
                  
                  console.log(`✅ User ${displayName} has ${messages.length} messages, last at ${new Date(lastMessageTime).toLocaleString()}`)
                }
              } catch (error) {
                console.error(`Error fetching messages for user ${user._id}:`, error)
              }
            }
            
            // Sort by lastMessageTime (most recent first)
            contactsWithMessages.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
            
            console.log('📱 Contacts with conversations:', contactsWithMessages)
            setContacts(contactsWithMessages)
            setHasLoadedOnce(true) // Mark as loaded
            
            // Select the first contact (most recent conversation)
            if (contactsWithMessages.length > 0) {
              setSelectedContact(contactsWithMessages[0].id)
            }
          } else {
            console.log('⚠️ No users from backend, using empty contacts')
            setContacts([])
            setHasLoadedOnce(true) // Mark as loaded even if empty
          }
        })
        .catch((error) => {
          console.error('❌ Error fetching users:', error)
          console.log('⚠️ Using empty contacts due to error')
          setContacts([])
          setHasLoadedOnce(true) // Mark as loaded even on error
        })
        .finally(() => {
          setIsInitialLoading(false) // End loading
        })
    }
  }, [currentUser, hasLoadedOnce])

  // Fetch messages when contact is selected
  useEffect(() => {
    if (currentUser && selectedContact) {
      // Check if we already loaded this conversation from cache
      if (messageCache.has(selectedContact)) {
        console.log('⏭️ Loading conversation from cache:', selectedContact)
        setMessages(messageCache.get(selectedContact) || [])
        
        // Reset unread count for selected contact
        setContacts(prev => prev.map(contact => 
          contact.id === selectedContact ? { ...contact, unread: 0 } : contact
        ))
        return
      }

      console.log('📨 Fetching messages for contact:', selectedContact)
      setIsLoading(true)
      fetchMessages(currentUser._id, selectedContact)
        .then((fetchedMessages) => {
          const formattedMessages: Message[] = fetchedMessages.map(msg => ({
            ...msg,
            fromMe: msg.sender === currentUser._id,
            time: new Date(msg.createdAt).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            type: msg.imageUrls && msg.imageUrls.length > 0 ? 'image' : 'text'
          }))
          
          // Set messages for display
          setMessages(formattedMessages)

          // Cache the messages for this contact
          setMessageCache(prev => new Map(prev).set(selectedContact, formattedMessages))

          // Mark this conversation as loaded
          setLoadedConversations(prev => new Set(prev).add(selectedContact))

          // Update contact's lastMessageTime if there are messages
          if (fetchedMessages.length > 0) {
            const latestMessage = fetchedMessages[fetchedMessages.length - 1]
            const lastMessageTime = new Date(latestMessage.createdAt).getTime()
            setContacts(prev => {
              const updatedContacts = prev.map(contact =>
                contact.id === selectedContact ? { ...contact, lastMessageTime } : contact
              )
              return updatedContacts.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
            })
          }

          // Mark unread messages as read using the backend's mark-as-read event
          const socket = getSocket()
          const unreadMessages = fetchedMessages.filter(msg => msg.receiver === currentUser._id && !msg.read)
          if (unreadMessages.length > 0) {
            socket?.emit('mark-as-read', { userId: currentUser._id, otherUserId: selectedContact })
          }
        })
        .catch((error) => {
          console.error('Error fetching messages:', error)
        })
        .finally(() => {
          setIsLoading(false)
        })
      
      // Reset unread count for selected contact
      setContacts(prev => prev.map(contact => 
        contact.id === selectedContact ? { ...contact, unread: 0 } : contact
      ))
    }
  }, [selectedContact, currentUser])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle typing indicators with debouncing
  const handleTyping = () => {
    if (!currentUser || !selectedContact) return

    const socket = getSocket()
    if (!socket) return

    // Emit typing-start event
    socket.emit('typing-start', { senderId: currentUser._id, receiverId: selectedContact })

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to emit typing-stop after 500ms of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', { senderId: currentUser._id, receiverId: selectedContact })
    }, 500)
  }

  const handleSend = async () => {
    if (!currentUser || !selectedContact) return
    if (!input.trim() && selectedFiles.length === 0) return
    
    const socket = getSocket()
    const messageText = input.trim()
    
    // If there are images, use REST API
    if (selectedFiles.length > 0) {
      try {
        const newMessage = await sendMessageAPI(
          currentUser._id,
          selectedContact,
          messageText || undefined,
          selectedFiles
        )
        
        setMessages(prev => [...prev, {
          ...newMessage,
          fromMe: true,
          time: 'now',
          type: 'image'
        }])
        
        // Update contact's lastMessageTime and sort
        setContacts(prev => {
          const updatedContacts = prev.map(contact =>
            contact.id === selectedContact ? { ...contact, lastMessageTime: Date.now() } : contact
          )
          return updatedContacts.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
        })
        
        setInput("")
        setSelectedFiles([])
        setImagePreview(null)
      } catch (error) {
        console.error('Error sending message with images:', error)
        alert('Failed to send message. Please try again.')
      }
    } else {
      // Use WebSocket for text-only messages
      const tempMessage: Message = {
        _id: Date.now().toString(),
        sender: currentUser._id,
        receiver: selectedContact,
        message: messageText,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fromMe: true,
        time: 'now',
        type: 'text'
      }
      
      setMessages(prev => [...prev, tempMessage])
      
      // Update contact's lastMessageTime and sort
      setContacts(prev => {
        const updatedContacts = prev.map(contact =>
          contact.id === selectedContact ? { ...contact, lastMessageTime: Date.now() } : contact
        )
        return updatedContacts.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
      })
      
      setInput("")
      
      // Stop typing indicator and send via WebSocket
      socket?.emit('typing-stop', { senderId: currentUser._id, receiverId: selectedContact })
      socket?.emit('private-message', {
        senderId: currentUser._id,
        receiverId: selectedContact,
        text: messageText,
        images: []
      })
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(files.slice(0, 5)) // Max 5 images
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(files[0])
    }
  }

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg._id === messageId) {
        const reactions = msg.reactions || []
        const existingReaction = reactions.find(r => r.emoji === emoji)
        if (existingReaction) {
          existingReaction.count += 1
        } else {
          reactions.push({ emoji, count: 1 })
        }
        return { ...msg, reactions }
      }
      return msg
    }))
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return
    }

    try {
      await deleteMessage(messageId)
      setMessages(prev => prev.filter(msg => msg._id !== messageId))
      console.log('✅ Message deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting message:', error)
      alert('Failed to delete message. Please try again.')
    }
  }

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedContactData = contacts.find(c => c.id === selectedContact)

  // Show loading screen while initial data is being fetched
  if (isInitialLoading) {
    return (
      <div className="max-w-6xl mx-auto py-6">
        <div className="flex rounded-3xl shadow-2xl bg-white border border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="w-full flex flex-col items-center justify-center">
            {/* Animated Loader */}
            <div className="relative">
              {/* Outer spinning ring */}
              <div className="w-20 h-20 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin"></div>
              
              {/* Inner pulsing circle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-400 rounded-full animate-pulse"></div>
              </div>
              
              {/* Message icon in center */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            
            {/* Loading text */}
            <div className="mt-6 text-center">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Loading Messages</h3>
              <p className="text-slate-600 animate-pulse">Fetching your conversations...</p>
            </div>
            
            {/* Loading dots animation */}
            <div className="flex gap-2 mt-4">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      {/* Connection Status Indicator */}
      {!isConnected && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-800">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Connecting to server...</span>
        </div>
      )}
      
      {isConnected && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium">✓ Connected to real-time messaging</span>
        </div>
      )}

      <div className="flex rounded-3xl shadow-2xl bg-white border border-slate-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Enhanced Contacts Sidebar */}
        <aside className="w-1/3 bg-gradient-to-br from-slate-50 to-purple-50 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
              <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <MoreVertical className="h-5 w-5 text-slate-600" />
              </button>
            </div>
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-full border-slate-300 bg-white/80 focus:bg-white"
              />
            </div>
          </div>
          
          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Conversations Yet</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  {searchQuery 
                    ? `No contacts found matching "${searchQuery}"`
                    : "Start a conversation by sending a message to a user"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left hover:bg-white/70 ${
                    selectedContact === contact.id
                      ? "bg-white shadow-md ring-2 ring-purple-200"
                      : "hover:shadow-sm"
                  }`}
                >
                  <div className="relative">
                    {contact.profilePicture ? (
                      <img 
                        src={contact.profilePicture.startsWith('http') ? contact.profilePicture : `https://rentify-server-ge0f.onrender.com${contact.profilePicture}`}
                        alt={contact.name}
                        className="w-12 h-12 rounded-full object-cover shadow-md"
                        onError={(e) => {
                          // Fallback to avatar letter if image fails to load
                          (e.target as HTMLImageElement).style.display = 'none'
                          const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-400 flex items-center justify-center font-bold text-white text-lg shadow-md"
                      style={{ display: contact.profilePicture ? 'none' : 'flex' }}
                    >
                      {contact.avatar}
                    </div>
                    {/* Online Status */}
                    {contact.online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                    {/* Unread Badge */}
                    {contact.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {contact.unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 truncate">{contact.name}</h3>
                      {contact.typing && (
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate">
                      {contact.online ? "Online" : contact.typing ? "Typing..." : `Last seen ${contact.lastSeen}`}
                    </p>
                  </div>
                </button>
              ))}
              </div>
            )}
          </div>
        </aside>

        {/* Enhanced Chat Panel */}
        <section className="flex-1 flex flex-col bg-gradient-to-br from-white to-slate-50">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                {selectedContactData?.profilePicture ? (
                  <img 
                    src={selectedContactData.profilePicture.startsWith('http') ? selectedContactData.profilePicture : `https://rentify-server-ge0f.onrender.com${selectedContactData.profilePicture}`}
                    alt={selectedContactData.name}
                    className="w-10 h-10 rounded-full object-cover shadow-md"
                    onError={(e) => {
                      // Fallback to avatar letter if image fails to load
                      (e.target as HTMLImageElement).style.display = 'none'
                      const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div 
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-400 flex items-center justify-center font-bold text-white shadow-md"
                  style={{ display: selectedContactData?.profilePicture ? 'none' : 'flex' }}
                >
                  {selectedContactData?.avatar}
                </div>
                {selectedContactData?.online && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{selectedContactData?.name}</h3>
                <p className="text-sm text-slate-500">
                  {selectedContactData?.online ? "Online" : selectedContactData?.typing ? "Typing..." : `Last seen ${selectedContactData?.lastSeen}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <Phone className="h-5 w-5 text-slate-600" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <MoreVertical className="h-5 w-5 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Connection Status in Message Box */}
          <div className="px-6 py-2 border-b border-slate-100">
            {!isConnected ? (
              <div className="flex items-center gap-2 text-yellow-600 text-xs">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Connection to Server...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600 text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium">✓ Connected to Server</span>
              </div>
            )}
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600 mx-auto mb-2"></div>
                  <p className="text-slate-500 text-sm">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message._id} className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}>
                  <div className={`group max-w-[70%] relative`}>
                    {/* Message Bubble */}
                    <div className={`px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                      message.fromMe
                      ? "bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white ml-auto"
                      : "bg-white text-slate-800 border border-slate-100"
                  }`}>
                    {message.type === 'text' && message.message && (
                      <p className="text-sm leading-relaxed">{message.message}</p>
                    )}
                    {message.type === 'image' && message.imageUrls && message.imageUrls.length > 0 && (
                      <div className="space-y-2">
                        {message.imageUrls.map((url, idx) => (
                          <div key={idx} className="rounded-lg overflow-hidden">
                            <img src={url} alt={`Shared image ${idx + 1}`} className="max-w-full h-auto" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={`text-xs mt-2 flex items-center gap-1 ${
                      message.fromMe ? "text-purple-100 justify-end" : "text-slate-400"
                    }`}>
                      <span>{message.time}</span>
                      {/* Read Receipts - only show for sent messages */}
                      {message.fromMe && (
                        <div className="flex items-center">
                          {message.read ? (
                            // Double check for read
                            <div className="flex">
                              <Check className="h-3 w-3" />
                              <Check className="h-3 w-3 -ml-2" />
                            </div>
                          ) : (
                            // Single check for delivered
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {message.reactions.map((reaction, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-full px-2 py-1 text-xs flex items-center gap-1 shadow-sm">
                          <span>{reaction.emoji}</span>
                          <span className="text-slate-600">{reaction.count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons (appear on hover) */}
                  <div className={`absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${message.fromMe ? 'right-0' : 'left-0'}`}>
                    <div className="flex gap-1 bg-white border border-slate-200 rounded-full p-1 shadow-lg">
                      {/* Reaction buttons */}
                      {['❤️', '👍', '😊', '😂'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(message._id, emoji)}
                          className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                          title={`React with ${emoji}`}
                        >
                          <span className="text-sm">{emoji}</span>
                        </button>
                      ))}
                      
                      {/* Delete button - only show for own messages */}
                      {message.fromMe && (
                        <>
                          <div className="w-px h-6 bg-slate-200 mx-1"></div>
                          <button
                            onClick={() => handleDeleteMessage(message._id)}
                            className="p-1 hover:bg-red-100 rounded-full transition-colors"
                            title="Delete message"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )))}
            <div ref={messagesEndRef} />
          </div>

          {/* Image Preview */}
          {selectedFiles.length > 0 && imagePreview && (
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                  <button
                    onClick={() => {
                      setImagePreview(null)
                      setSelectedFiles([])
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-sm text-slate-600">
                  {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} ready to send
                </p>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-6 border-t border-slate-200 bg-white">
            <div className="flex items-end gap-3">
              {/* Attachment Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 hover:bg-slate-100 rounded-full transition-colors"
                title="Attach image"
              >
                <Paperclip className="h-5 w-5 text-slate-600" />
              </button>
              
              {/* Message Input */}
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    handleTyping()
                  }}
                  placeholder="Type a message..."
                  className="h-12 rounded-2xl border-slate-300 focus:border-purple-500 focus:ring-purple-500/20 bg-slate-50 focus:bg-white shadow-sm text-base pr-12"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                />
                {/* Emoji Button */}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <Smile className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              
              {/* Send Button */}
              <Button
                onClick={handleSend}
                disabled={!input.trim() && !imagePreview}
                className={`h-12 w-12 rounded-full shadow-lg transition-all duration-200 ${
                  input.trim() || imagePreview
                    ? "bg-gradient-to-r from-purple-600 to-fuchsia-500 hover:from-purple-700 hover:to-fuchsia-600 hover:scale-105"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                <Send className="h-5 w-5 text-white" />
              </Button>
            </div>

            {/* Quick Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl z-50">
                <div className="grid grid-cols-6 gap-2">
                  {['😊', '😂', '❤️', '👍', '👎', '😮', '😢', '😡', '🎉', '🔥', '💯', '✨'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setInput(prev => prev + emoji)
                        setShowEmojiPicker(false)
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </section>
      </div>
    </div>
  )
}

export default MessagesPage
