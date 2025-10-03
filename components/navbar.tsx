"use client"

import { Navigation, List, MessageCircle, User, Home, TrendingUp, Menu, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { useAuthStore } from "@/lib/auth-store"
import LoginModal from "./login-modal"
import SignupModal from "./signup-modal"

interface NavbarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export default function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isSignupOpen, setIsSignupOpen] = useState(false)
  
  const { user, logout } = useAuthStore()

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    // { id: "nearby", label: "Nearby", icon: Navigation },
    // { id: "list", label: "List", icon: List },
    { id: "messages", label: "Messages", icon: MessageCircle, badge: 3 },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
  ]

  const handleNavigation = (page: string) => {
    onPageChange(page)
    setIsMobileMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    onPageChange("home")
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="relative">
      {/* Desktop nav: clean, text-first style */}
      <div className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(item.id)}
              className={`relative rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-purple-600/10 text-purple-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className={`h-4 w-4 mr-2 ${isActive ? "text-purple-700" : "text-slate-500"}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              )}
            </Button>
          )
        })}
        
        {/* Auth buttons on the right */}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-full border border-purple-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-semibold text-slate-700">{user.username}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="rounded-full px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLoginOpen(true)}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                Login
              </Button>
              <Button
                size="sm"
                onClick={() => setIsSignupOpen(true)}
                className="rounded-full px-4 py-2 text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile: hamburger button and dropdown aligned to right */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2"
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {isMobileMenuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-xl z-50">
            <div className="py-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm ${
                      isActive
                        ? "bg-purple-50 text-purple-700"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-purple-700" : "text-slate-500"}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />}
                  </button>
                )
              })}
              
              {/* Mobile auth buttons */}
              <div className="border-t border-slate-200 mt-2 pt-2 px-4 pb-2 space-y-2">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{user.username}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsLoginOpen(true)
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    >
                      Login
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setIsSignupOpen(true)
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
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
    </div>
  )
}
