"use client"

import { Navigation, List, MessageCircle, User, Home, Menu, X, LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname } from 'next/navigation'
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useAuthStore } from "@/lib/auth-store"
import LoginModal from "./login-modal"
import SignupModal from "./signup-modal"

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSignupOpen, setIsSignupOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "my-listings", label: "My Listings", icon: List, path: "/my-listings" },
    { id: "messages", label: "Messages", icon: MessageCircle, path: "/messages", badge: 0 },
  ]

  // Determine active page based on pathname
  const getActivePage = () => {
    if (pathname === "/") return "home"
    if (pathname?.includes("/my-listings")) return "my-listings"
    if (pathname?.includes("/messages")) return "messages"
    if (pathname?.includes("/profile")) return "profile"
    return "home"
  }

  const currentPage = getActivePage()

  const handleNavigation = (path: string) => {
    router.push(path)
    setIsMobileMenuOpen(false)
  }

  const handleProfileClick = () => {
    router.push("/profile")
    setIsMobileMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    router.push("/")
    setIsMobileMenuOpen(false)
  }

  // Prevent rendering until client is mounted
  if (!mounted) {
    return null
  }

  return (
    <>
      {/* Top Navigation Bar - fixed so it remains visible across route changes */}
      <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          <div className="flex items-center justify-between h-16 md:h-20">
            
            {/* Logo/Brand - Left Side */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleNavigation("/")}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <span className="hidden sm:inline font-bold text-lg bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  Rentify
                </span>
              </button>
            </div>

            {/* Desktop Navigation - Center */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      isActive
                        ? "bg-violet-100 text-violet-700"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Desktop Auth Section - Right Side */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  {/* Profile Button */}
                  <button
                    onClick={handleProfileClick}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 ${
                      currentPage === "profile"
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 border-violet-600 shadow-lg"
                        : "bg-white border-violet-200 hover:border-violet-300 hover:bg-violet-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm overflow-hidden ${
                      currentPage === "profile"
                        ? "bg-white text-violet-600"
                        : "bg-gradient-to-br from-violet-600 to-purple-600 text-white"
                    }`}>
                      {user.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={user.username || user.name || 'User'} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            try {
                              const img = e.target as HTMLImageElement
                              img.style.display = 'none'
                              const parent = img.parentElement
                              const fallbackText = (user.username || user.name || 'U').charAt(0).toUpperCase()
                              if (parent) {
                                parent.textContent = fallbackText
                              }
                            } catch (err) {
                              console.warn('Profile image fallback failed:', err)
                            }
                          }}
                        />
                      ) : (
                        (user.username || user.name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${
                      currentPage === "profile" ? "text-white" : "text-slate-700"
                    }`}>
                      {user.name || user.username}
                    </span>
                  </button>
                  
                  {/* Logout Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setIsLoginOpen(true)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => setIsSignupOpen(true)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button - Right Side */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="h-10 w-10 rounded-lg flex items-center justify-center p-0 hover:bg-slate-100"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-slate-700" />
                ) : (
                  <Menu className="h-5 w-5 text-slate-700" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 z-30 md:hidden bg-white border-b border-slate-200 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-violet-100 text-violet-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}

              {/* Mobile Auth Section */}
              <div className="border-t border-slate-200 mt-3 pt-3 space-y-2">
                {user ? (
                  <>
                    {/* Mobile Profile Button */}
                    <button
                      onClick={handleProfileClick}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                        currentPage === "profile"
                          ? "bg-gradient-to-r from-violet-600 to-purple-600 border-violet-600 text-white"
                          : "bg-white border-violet-200 text-slate-700 hover:bg-violet-50"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-semibold text-xs overflow-hidden ${
                        currentPage === "profile"
                          ? "bg-white text-violet-600"
                          : "bg-gradient-to-br from-violet-600 to-purple-600 text-white"
                      }`}>
                        {user.profilePicture ? (
                          <img 
                            src={user.profilePicture} 
                            alt={user.username || user.name || 'User'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (user.username || user.name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="flex-1 text-left">
                        {user.name || user.username}
                      </span>
                    </button>

                    {/* Mobile Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsLoginOpen(true)
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Login
                    </Button>
                    <Button
                      onClick={() => {
                        setIsSignupOpen(true)
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full rounded-lg px-4 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md"
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modals */}
      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        onSwitchToSignup={() => {
          setIsLoginOpen(false)
          setIsSignupOpen(true)
        }}
      />
      <SignupModal 
        isOpen={isSignupOpen} 
        onClose={() => setIsSignupOpen(false)}
        onSwitchToLogin={() => {
          setIsSignupOpen(false)
          setIsLoginOpen(true)
        }}
      />
    </>
  )
}