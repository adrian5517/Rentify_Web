"use client"
import { useState, useEffect, useMemo } from "react"
import {
  Search,
  MapPin,
  Filter,
  Phone,
  Home,
  Grid,
  Map,
  Star,
  Bath,
  Bed,
  Car,
  Plus,
  MessageCircle,
  User,
  Navigation,
  List,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import PropertyMap from "@/components/property-map"
import Navbar from "@/components/navbar"
import { properties, type Property } from "@/lib/property-data"
import { getRecommendations, clusterProperties } from "@/lib/ml-utils"
import AnalyticsDashboard from "@/components/analytics-dashboard"
import AddPropertyModal from "@/components/add-property-modal"

function NearbyPage() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <Navigation className="h-16 w-16 mx-auto text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Properties Near You</h2>
        <p className="text-slate-600">Discover rentals within walking distance</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {properties.slice(0, 6).map((property) => (
          <Card key={property.id} className="hover:shadow-lg transition-shadow">
            <div className="relative h-48">
              <img
                src={property.images[0] || "/placeholder.svg"}
                alt={property.name}
                className="h-full w-full object-cover rounded-t-lg"
              />
              <Badge className="absolute top-2 right-2 bg-green-600 text-white">0.5 km away</Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-1">{property.name}</h3>
              <p className="text-blue-600 font-bold">₱{property.price.toLocaleString()}</p>
              <p className="text-sm text-slate-600 mt-1">{property.location.address}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ListPage({ onOpenModal }: { onOpenModal: () => void }) {
  const [activeTab, setActiveTab] = useState<"posted" | "rented">("posted")
  const postedProperties = properties.filter(
    (property) => property.status === "Available" || property.status === "Rented",
  )
  const rentedProperties = properties.filter((property) => property.status === "Rented").slice(0, 2)

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <List className="h-16 w-16 mx-auto text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">My Properties</h2>
        <p className="text-slate-600">Manage your posted and rented properties</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex bg-slate-100 rounded-lg p-1">
          <Button
            variant={activeTab === "posted" ? "default" : "ghost"}
            onClick={() => setActiveTab("posted")}
            className={`px-6 py-2 rounded-md transition-all ${
              activeTab === "posted" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Your Posted ({postedProperties.length})
          </Button>
          <Button
            variant={activeTab === "rented" ? "default" : "ghost"}
            onClick={() => setActiveTab("rented")}
            className={`px-6 py-2 rounded-md transition-all ${
              activeTab === "rented" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Your Rented ({rentedProperties.length})
          </Button>
        </div>

        <button
          onClick={onOpenModal}
          className="relative px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-pulse hover:animate-none font-semibold text-lg group"
          style={{
            background: "linear-gradient(to right, #10b981, #059669, #0d9488)",
            color: "white !important",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = "linear-gradient(to right, #059669, #047857, #0f766e)"
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = "linear-gradient(to right, #10b981, #059669, #0d9488)"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-teal-400 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
          <div className="relative flex items-center gap-3">
            <Plus className="h-5 w-5" />
            <span>Post Your Property</span>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
          </div>
        </button>
      </div>

      {activeTab === "posted" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Your Posted Properties</h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {postedProperties.length} properties
            </Badge>
          </div>
          <div className="space-y-4">
            {postedProperties.slice(0, 3).map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3">
                    <img
                      src={property.images[0] || "/placeholder.svg"}
                      alt={property.name}
                      className="h-48 md:h-full w-full object-cover rounded-l-lg"
                    />
                  </div>
                  <CardContent className="md:w-2/3 p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-xl">{property.name}</h4>
                      <Badge
                        className={
                          property.status === "Available" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        }
                      >
                        {property.status}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mb-2">₱{property.price.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mb-3 text-slate-600">
                      <MapPin className="h-4 w-4" />
                      <span>{property.location.address}</span>
                    </div>
                    <p className="text-slate-600 mb-4">{property.description}</p>
                    <div className="flex items-center gap-4 text-slate-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        <span>3 beds</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        <span>2 baths</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        <span>1 parking</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Edit Listing
                      </Button>
                      <Button variant="outline" size="sm">
                        View Analytics
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "rented" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Your Rented Properties</h3>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {rentedProperties.length} properties
            </Badge>
          </div>
          <div className="space-y-4">
            {rentedProperties.map((property) => (
              <Card key={`rented-${property.id}`} className="hover:shadow-lg transition-shadow border-green-200">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3">
                    <img
                      src={property.images[0] || "/placeholder.svg"}
                      alt={property.name}
                      className="h-48 md:h-full w-full object-cover rounded-l-lg"
                    />
                  </div>
                  <CardContent className="md:w-2/3 p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-xl">{property.name}</h4>
                      <Badge className="bg-green-100 text-green-800">Currently Renting</Badge>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mb-2">₱{property.price.toLocaleString()}/month</p>
                    <div className="flex items-center gap-2 mb-3 text-slate-600">
                      <MapPin className="h-4 w-4" />
                      <span>{property.location.address}</span>
                    </div>
                    <p className="text-slate-600 mb-4">
                      Lease started: January 2024 • Next payment due: March 15, 2024
                    </p>
                    <div className="flex items-center gap-4 text-slate-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        <span>3 beds</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        <span>2 baths</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        <span>1 parking</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Contact Landlord
                      </Button>
                      <Button variant="outline" size="sm">
                        Pay Rent
                      </Button>
                      <Button variant="outline" size="sm">
                        Report Issue
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MessagesPage() {
  const messages = [
    { id: 1, name: "John Santos", message: "Is the apartment still available?", time: "2 hours ago", unread: true },
    { id: 2, name: "Maria Cruz", message: "Can we schedule a viewing?", time: "5 hours ago", unread: true },
    { id: 3, name: "Robert Kim", message: "Thank you for the tour!", time: "1 day ago", unread: false },
    { id: 4, name: "Lisa Wong", message: "What's included in the rent?", time: "2 days ago", unread: false },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <MessageCircle className="h-16 w-16 mx-auto text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Messages</h2>
        <p className="text-slate-600">Stay connected with potential tenants</p>
      </div>
      <div className="space-y-4">
        {messages.map((message) => (
          <Card
            key={message.id}
            className={`hover:shadow-lg transition-shadow ${message.unread ? "border-blue-200 bg-blue-50/50" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{message.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{message.name}</h3>
                    <p className="text-sm text-slate-600">{message.time}</p>
                  </div>
                </div>
                {message.unread && <div className="w-3 h-3 bg-blue-600 rounded-full"></div>}
              </div>
              <p className="text-slate-700 ml-13">{message.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ProfilePage() {
  const user = JSON.parse(localStorage.getItem("rentify_auth") || '{"name": "User", "email": "user@example.com"}')

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{user.name}</h2>
        <p className="text-slate-600">{user.email}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">My Properties</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Active Listings</span>
                <span className="font-semibold">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Views</span>
                <span className="font-semibold">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Inquiries</span>
                <span className="font-semibold">28</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Account Settings</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                Edit Profile
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                Notification Settings
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent">
                Privacy Settings
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 bg-transparent">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function AnalyticsPage() {
  return <AnalyticsDashboard />
}

function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem("rentify_auth", JSON.stringify({ email, name: name || email }))
    onAuth()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md backdrop-blur-sm bg-white/90 border-0 shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                <Home className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Rentify
              </h1>
            </div>
            <p className="text-slate-600 text-lg font-medium">Find your perfect rental in Naga City</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required={!isLogin}
                  className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PropertyListingPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [priceRange, setPriceRange] = useState([0, 50000000])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState("grid")
  const [recommendations, setRecommendations] = useState<Property[]>([])
  const [clusters, setClusters] = useState<any[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentPage, setCurrentPage] = useState("home")
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesSearch =
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.address.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1]
      return matchesSearch && matchesPrice
    })
  }, [searchTerm, priceRange])

  useEffect(() => {
    const propertyData = filteredProperties.map((p) => [p.location.latitude, p.location.longitude, p.price])
    const clusteredData = clusterProperties(propertyData, 3)
    setClusters(clusteredData)
  }, [filteredProperties])

  useEffect(() => {
    if (selectedProperty) {
      const recs = getRecommendations(selectedProperty, properties, 3)
      setRecommendations(recs)
    }
  }, [selectedProperty])

  useEffect(() => {
    const authStatus = localStorage.getItem("rentify_auth")
    setIsAuthenticated(!!authStatus)
  }, [])

  const handleOpenModal = () => {
    console.log("[v0] Opening modal, current state:", showAddPropertyModal)
    setShowAddPropertyModal(true)
    console.log("[v0] Modal state should now be true")
  }

  const handleCloseModal = () => {
    console.log("[v0] Closing modal")
    setShowAddPropertyModal(false)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "nearby":
        return <NearbyPage />
      case "list":
        return <ListPage onOpenModal={handleOpenModal} />
      case "messages":
        return <MessagesPage />
      case "profile":
        return <ProfilePage />
      case "analytics":
        return <AnalyticsPage />
      default:
        return (
          <>
            {viewMode === "grid" ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredProperties.map((property) => (
                  <Card
                    key={property.id}
                    className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-white"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={property.images[0] || "/placeholder.svg"}
                        alt={property.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      <Badge className="absolute top-3 right-3 bg-white/90 text-slate-700 border-0 shadow-md font-semibold">
                        {property.status}
                      </Badge>
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 rounded-full px-2 py-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-semibold text-slate-700">4.8</span>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold text-slate-900 text-balance mb-2">{property.name}</h3>
                      <p className="text-2xl font-bold text-blue-600 mb-3">{formatPrice(property.price)}</p>
                      <div className="flex items-center gap-2 mb-3 text-slate-600">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">{property.location.address}</span>
                      </div>
                      <div className="flex items-center gap-4 mb-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          <span className="text-sm font-medium">3 beds</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          <span className="text-sm font-medium">2 baths</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          <span className="text-sm font-medium">1 parking</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{property.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {property.amenities.slice(0, 2).map((amenity) => (
                          <Badge key={amenity} variant="outline" className="text-xs border-slate-200 text-slate-600">
                            {amenity}
                          </Badge>
                        ))}
                        {property.amenities.length > 2 && (
                          <Badge variant="outline" className="text-xs border-slate-200 text-slate-600">
                            +{property.amenities.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="p-6 pt-0">
                      <button
                        onClick={() => setSelectedProperty(property)}
                        className="w-full h-11 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                        style={{
                          background: "linear-gradient(to right, #2563eb, #4f46e5)",
                          color: "white !important",
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.background = "linear-gradient(to right, #1d4ed8, #4338ca)"
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.background = "linear-gradient(to right, #2563eb, #4f46e5)"
                        }}
                      >
                        View Details
                      </button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="h-[600px] rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                <PropertyMap 
                  properties={filteredProperties} 
                  clusters={clusters}
                  center={[123.1815, 13.6218]} 
                  zoom={13}
                />
              </div>
            )}
            {filteredProperties.length === 0 && (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
                  <Search className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-slate-600 text-xl font-medium">No properties found matching your criteria.</p>
                <p className="text-slate-500 mt-2">Try adjusting your search or filters.</p>
              </div>
            )}
          </>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-md">
                <Home className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Rentify
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {currentPage === "home" && (
                <>
                  <button
                    onClick={handleOpenModal}
                    className="hidden md:flex items-center gap-2 px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
                    style={{
                      background: "linear-gradient(to right, #10b981, #059669, #0d9488)",
                      color: "white !important",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = "linear-gradient(to right, #059669, #047857, #0f766e)"
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = "linear-gradient(to right, #10b981, #059669, #0d9488)"
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Post Property
                  </button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    onClick={() => setViewMode("grid")}
                    className={
                      viewMode === "grid"
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-slate-300 hover:bg-slate-50"
                    }
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === "map" ? "default" : "outline"}
                    onClick={() => setViewMode("map")}
                    className={
                      viewMode === "map"
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-slate-300 hover:bg-slate-50"
                    }
                  >
                    <Map className="h-4 w-4 mr-2" />
                    Map
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />

      {currentPage === "home" && (
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search properties in Naga City..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-slate-50 focus:bg-white transition-colors"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 h-12 px-6 border-slate-300 hover:bg-slate-50"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
            {showFilters && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-3 block">Price Range</label>
                    <div className="mt-2">
                      <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        max={50000000}
                        min={0}
                        step={100000}
                        className="w-full"
                      />
                      <div className="mt-3 flex justify-between text-sm font-medium text-slate-600">
                        <span>{formatPrice(priceRange[0])}</span>
                        <span>{formatPrice(priceRange[1])}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">{renderCurrentPage()}</main>

      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative group">
          <Button
            size="lg"
            onClick={handleOpenModal}
            className="h-16 w-16 rounded-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 animate-pulse hover:animate-none"
          >
            <Plus className="h-7 w-7 text-white" />
          </Button>

          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-teal-400 animate-ping opacity-20"></div>

          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Add New Property
            <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900"></div>
          </div>
        </div>
      </div>

      <AddPropertyModal isOpen={showAddPropertyModal} onClose={handleCloseModal} />

      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProperty && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-balance">{selectedProperty.name}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="relative h-64 rounded-lg overflow-hidden">
                    <img
                      src={selectedProperty.images[0] || "/placeholder.svg"}
                      alt={selectedProperty.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-4 h-48 rounded-lg overflow-hidden">
                    <PropertyMap
                      properties={[selectedProperty]}
                      clusters={[]}
                      center={[selectedProperty.location.longitude, selectedProperty.location.latitude]}
                      zoom={15}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold text-blue-600">{formatPrice(selectedProperty.price)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedProperty.location.address}</span>
                    </div>
                  </div>
                  <div>
                    <Badge className="bg-primary text-primary-foreground">{selectedProperty.status}</Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Description</h4>
                    <p className="text-muted-foreground text-pretty">{selectedProperty.description}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity: string) => (
                        <Badge key={amenity} variant="outline">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Contact
                    </Button>
                    <Button variant="secondary" className="flex-1">
                      Rent Now
                    </Button>
                  </div>
                </div>
              </div>
              {recommendations.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-foreground mb-4">Recommended Properties</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    {recommendations.map((rec) => (
                      <Card
                        key={rec.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedProperty(rec)}
                      >
                        <div className="relative h-32">
                          <img
                            src={rec.images[0] || "/placeholder.svg"}
                            alt={rec.name}
                            className="h-full w-full object-cover rounded-t-lg"
                          />
                        </div>
                        <CardContent className="p-3">
                          <h5 className="font-medium text-sm text-balance">{rec.name}</h5>
                          <p className="text-primary font-semibold">{formatPrice(rec.price)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
