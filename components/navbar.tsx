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
      {/* Desktop nav: inline beside logo */}
      <div className="hidden md:flex items-center">
        <div className="flex items-center bg-slate-100 rounded-2xl p-1.5 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => onPageChange(item.id)}
                className={`relative flex items-center gap-3 px-6 py-3 transition-all duration-200 rounded-xl font-semibold ${
                  isActive
                    ? "bg-white text-blue-600 shadow-md hover:shadow-lg"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-blue-600" : ""}`} />
                <span className="hidden lg:block">{item.label}</span>
                {item.badge && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white border-2 border-white shadow-sm">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Mobile: hamburger button and dropdown */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {isMobileMenuOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 shadow-xl rounded-xl z-50">
            <div className="px-3 py-2">
              <div className="grid grid-cols-2 gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.id

                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      onClick={() => handleNavigation(item.id)}
                      className={`relative flex items-center gap-3 p-4 transition-all duration-200 rounded-xl font-semibold justify-start ${
                        isActive
                          ? "bg-blue-50 text-blue-600 border border-blue-200"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "text-blue-600" : ""}`} />
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
