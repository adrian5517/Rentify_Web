"use client"

import { Navigation, List, MessageCircle, User, Home, TrendingUp, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

interface NavbarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

export default function Navbar({ currentPage, onPageChange }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "nearby", label: "Nearby", icon: Navigation },
    { id: "list", label: "List", icon: List },
    { id: "messages", label: "Messages", icon: MessageCircle, badge: 3 },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: User },
  ]

  const handleNavigation = (page: string) => {
    onPageChange(page)
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
