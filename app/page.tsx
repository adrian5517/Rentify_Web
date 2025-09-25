"use client"
import { useState, useEffect, useMemo } from "react"
import Image from "next/image"
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import PropertyMap from "@/components/property-map"
import Navbar from "@/components/navbar"
import { type Property } from "@/lib/property-data"
import { getRecommendations, clusterProperties } from "@/lib/ml-utils"
import AnalyticsDashboard from "@/components/analytics-dashboard"
import AddPropertyModal from "@/components/add-property-modal"

// API Property interface matching the API response
interface APIProperty {
  _id: string
  name: string
  description: string
  images: string[]
  price: number
  propertyType: string
  amenities: string[]
  status: string
  location: {
    address: string
    latitude: number
    longitude: number
  }
  createdAt: string
  __v: number
}

// Helper function to get proper image URI
const getImageUri = (property: Property | APIProperty, imageIndex: number = 0) => {
  if (!property?.images?.length) return 'https://via.placeholder.com/400x300?text=No+Image';
  const path = property.images[imageIndex];
  if (!path) return 'https://via.placeholder.com/400x300?text=No+Image';
  return path.startsWith('http') ? path : `https://rentify-server-ge0f.onrender.com${path.startsWith('/') ? path : '/' + path}`;
};

// Image Slider Component
interface ImageSliderProps {
  property: Property
  className?: string
}

function ImageSlider({ property, className = "h-56" }: ImageSliderProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const totalImages = property.images?.length || 0

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % totalImages)
  }

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev - 1 + totalImages) % totalImages)
  }

  const goToImage = (index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex(index)
  }

  if (totalImages === 0) {
    return (
      <div className={`${className} bg-slate-200 flex items-center justify-center rounded-t-lg`}>
        <span className="text-slate-500">No Image Available</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className} overflow-hidden group`}>
      <img
        src={getImageUri(property, currentImageIndex)}
        alt={`${property.name} - Image ${currentImageIndex + 1}`}
        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Error'
        }}
      />
      
      {/* Navigation Arrows */}
      {totalImages > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Image Indicators */}
      {totalImages > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {property.images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => goToImage(index, e)}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                index === currentImageIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}

      {/* Image Counter */}
      {totalImages > 1 && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {currentImageIndex + 1} / {totalImages}
        </div>
      )}
    </div>
  )
}

// function NearbyPage({ properties }: { properties: Property[] }) {
//   return (
//     <div className="space-y-6">
//       <div className="text-center py-8">
//         <Navigation className="h-16 w-16 mx-auto text-blue-600 mb-4" />
//         <h2 className="text-2xl font-bold text-slate-900 mb-2">Properties Near You</h2>
//         <p className="text-slate-600">Discover rentals within walking distance</p>
//       </div>
//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//         {properties.slice(0, 6).map((property) => (
//           <Card key={property.id} className="hover:shadow-lg transition-shadow">
//             <div className="relative h-48">
//               <ImageSlider property={property} className="h-48" />
//               <Badge className="absolute top-2 right-2 bg-green-600 text-white">0.5 km away</Badge>
//             </div>
//             <CardContent className="p-4">
//               <h3 className="font-semibold text-lg mb-1">{property.name}</h3>
//               <p className="text-blue-600 font-bold">₱{property.price.toLocaleString()}</p>
//               <p className="text-sm text-slate-600 mt-1">{property.location.address}</p>
//             </CardContent>
//           </Card>
//         ))}
//       </div>
//     </div>
//   )
// }

// function ListPage({ onOpenModal, properties }: { onOpenModal: () => void; properties: Property[] }) {
//   const [activeTab, setActiveTab] = useState<"posted" | "rented">("posted")
//   const postedProperties = properties.filter(
//     (property) => property.status === "Available" || property.status === "Rented",
//   )
//   const rentedProperties = properties.filter((property) => property.status === "Rented").slice(0, 2)

//   return (
//     <div className="space-y-8">
//       <div className="text-center py-8">
//         <List className="h-16 w-16 mx-auto text-blue-600 mb-4" />
//         <h2 className="text-2xl font-bold text-slate-900 mb-2">My Properties</h2>
//         <p className="text-slate-600">Manage your posted and rented properties</p>
//       </div>

//       <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
//         <div className="flex bg-slate-100 rounded-lg p-1">
//           <Button
//             variant={activeTab === "posted" ? "default" : "ghost"}
//             onClick={() => setActiveTab("posted")}
//             className={`px-6 py-2 rounded-md transition-all ${
//               activeTab === "posted" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
//             }`}
//           >
//             Your Posted ({postedProperties.length})
//           </Button>
//           <Button
//             variant={activeTab === "rented" ? "default" : "ghost"}
//             onClick={() => setActiveTab("rented")}
//             className={`px-6 py-2 rounded-md transition-all ${
//               activeTab === "rented" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"
//             }`}
//           >
//             Your Rented ({rentedProperties.length})
//           </Button>
//         </div>

//         <button
//           onClick={onOpenModal}
//           className="relative px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-pulse hover:animate-none font-semibold text-lg group"
//           style={{
//             background: "linear-gradient(to right, #10b981, #059669, #0d9488)",
//             color: "white !important",
//           }}
//           onMouseEnter={(e) => {
//             (e.target as HTMLElement).style.background = "linear-gradient(to right, #059669, #047857, #0f766e)"
//           }}
//           onMouseLeave={(e) => {
//             (e.target as HTMLElement).style.background = "linear-gradient(to right, #10b981, #059669, #0d9488)"
//           }}
//         >
//           <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-teal-400 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
//           <div className="relative flex items-center gap-3">
//             <Plus className="h-5 w-5" />
//             <span>Post Your Property</span>
//             <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
//           </div>
//         </button>
//       </div>

//       {activeTab === "posted" && (
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <h3 className="text-xl font-bold text-slate-900">Your Posted Properties</h3>
//             <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
//               {postedProperties.length} properties
//             </Badge>
//           </div>
//           <div className="space-y-4">
//             {postedProperties.slice(0, 3).map((property) => (
//               <Card key={property.id} className="hover:shadow-lg transition-shadow">
//                 <div className="flex flex-col md:flex-row">
//                   <div className="md:w-1/3">
//                     <ImageSlider property={property} className="h-48 md:h-full rounded-l-lg" />
//                   </div>
//                   <CardContent className="md:w-2/3 p-6">
//                     <div className="flex justify-between items-start mb-2">
//                       <h4 className="font-bold text-xl">{property.name}</h4>
//                       <Badge
//                         className={
//                           property.status === "Available" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
//                         }
//                       >
//                         {property.status}
//                       </Badge>
//                     </div>
//                     <p className="text-2xl font-bold text-blue-600 mb-2">₱{property.price.toLocaleString()}</p>
//                     <div className="flex items-center gap-2 mb-3 text-slate-600">
//                       <MapPin className="h-4 w-4" />
//                       <span>{property.location.address}</span>
//                     </div>
//                     <p className="text-slate-600 mb-4">{property.description}</p>
//                     <div className="flex items-center gap-4 text-slate-600 mb-4">
//                       <div className="flex items-center gap-1">
//                         <Bed className="h-4 w-4" />
//                         <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
//                       </div>
//                       <div className="flex items-center gap-1">
//                         <Bath className="h-4 w-4" />
//                         <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
//                       </div>
//                       <div className="flex items-center gap-1">
//                         <Home className="h-4 w-4" />
//                         <span className="capitalize">{property.propertyType}</span>
//                       </div>
//                     </div>
//                     <div className="flex gap-2">
//                       <Button variant="outline" size="sm">
//                         Edit Listing
//                       </Button>
//                       <Button variant="outline" size="sm">
//                         View Analytics
//                       </Button>
//                     </div>
//                   </CardContent>
//                 </div>
//               </Card>
//             ))}
//           </div>
//         </div>
//       )}

//       {activeTab === "rented" && (
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <h3 className="text-xl font-bold text-slate-900">Your Rented Properties</h3>
//             <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
//               {rentedProperties.length} properties
//             </Badge>
//           </div>
//           <div className="space-y-4">
//             {rentedProperties.map((property) => (
//               <Card key={`rented-${property.id}`} className="hover:shadow-lg transition-shadow border-green-200">
//                 <div className="flex flex-col md:flex-row">
//                   <div className="md:w-1/3">
//                     <ImageSlider property={property} className="h-48 md:h-full rounded-l-lg" />
//                   </div>
//                   <CardContent className="md:w-2/3 p-6">
//                     <div className="flex justify-between items-start mb-2">
//                       <h4 className="font-bold text-xl">{property.name}</h4>
//                       <Badge className="bg-green-100 text-green-800">Currently Renting</Badge>
//                     </div>
//                     <p className="text-2xl font-bold text-green-600 mb-2">₱{property.price.toLocaleString()}/month</p>
//                     <div className="flex items-center gap-2 mb-3 text-slate-600">
//                       <MapPin className="h-4 w-4" />
//                       <span>{property.location.address}</span>
//                     </div>
//                     <p className="text-slate-600 mb-4">
//                       Lease started: January 2024 • Next payment due: March 15, 2024
//                     </p>
//                     <div className="flex items-center gap-4 text-slate-600 mb-4">
//                       <div className="flex items-center gap-1">
//                         <Bed className="h-4 w-4" />
//                         <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
//                       </div>
//                       <div className="flex items-center gap-1">
//                         <Bath className="h-4 w-4" />
//                         <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
//                       </div>
//                       <div className="flex items-center gap-1">
//                         <Home className="h-4 w-4" />
//                         <span className="capitalize">{property.propertyType}</span>
//                       </div>
//                     </div>
//                     <div className="flex gap-2">
//                       <Button variant="outline" size="sm">
//                         Contact Landlord
//                       </Button>
//                       <Button variant="outline" size="sm">
//                         Pay Rent
//                       </Button>
//                       <Button variant="outline" size="sm">
//                         Report Issue
//                       </Button>
//                     </div>
//                   </CardContent>
//                 </div>
//               </Card>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

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
              <Image
                src="/titke-logo (1).png"
                alt="Rentify"
                width={200}
                height={52}
                className="h-12 w-auto"
                priority
              />
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
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // New clustering state
  const [selectedCluster, setSelectedCluster] = useState(0)
  const [enableClustering, setEnableClustering] = useState(false)
  const [navigationMode, setNavigationMode] = useState(false)

  // Function to convert API property to Property interface
  const convertAPIProperty = (apiProperty: APIProperty): Property => ({
    id: apiProperty._id,
    name: apiProperty.name,
    description: apiProperty.description,
    price: apiProperty.price,
    location: {
      address: apiProperty.location.address,
      latitude: apiProperty.location.latitude,
      longitude: apiProperty.location.longitude,
    },
    images: apiProperty.images,
    amenities: apiProperty.amenities,
    status: apiProperty.status === "available" ? "Available" : 
            apiProperty.status === "rented" ? "Rented" : "Available" as "Available" | "Rented" | "Sold",
    propertyType: apiProperty.propertyType,
    bedrooms: 1, // Default values as API doesn't provide these
    bathrooms: 1,
    parking: apiProperty.amenities.some(a => a.toLowerCase().includes('parking')) ? 1 : 0,
  })

  // Fetch properties from API
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('https://rentify-server-ge0f.onrender.com/api/properties')
        
        if (!response.ok) {
          throw new Error('Failed to fetch properties')
        }
        
        const apiProperties: APIProperty[] = await response.json()
        const convertedProperties = apiProperties.map(convertAPIProperty)
        setProperties(convertedProperties)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching properties:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [])

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesSearch =
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.address.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1]
      return matchesSearch && matchesPrice
    })
  }, [searchTerm, priceRange, properties])

  useEffect(() => {
    if (filteredProperties.length > 0) {
      const propertyData = filteredProperties.map((p) => [p.location.latitude, p.location.longitude, p.price])
      const clusteredData = clusterProperties(propertyData, 3)
      setClusters(clusteredData)
    }
  }, [filteredProperties])

  useEffect(() => {
    if (selectedProperty && properties.length > 0) {
      const recs = getRecommendations(selectedProperty, properties, 3)
      setRecommendations(recs)
    }
  }, [selectedProperty, properties])

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
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            {/* Enhanced loading animation */}
            <div className="relative mx-auto mb-6">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-600 rounded-full animate-spin opacity-50" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
            </div>
            <div className="space-y-2">
              <p className="text-slate-900 text-lg font-semibold">Loading Properties</p>
              <p className="text-slate-600">Finding the perfect rentals for you...</p>
              {/* Loading progress bar */}
              <div className="w-48 h-1 bg-slate-200 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-red-600 text-lg mb-2">Error loading properties</p>
            <p className="text-slate-500">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    switch (currentPage) {
      // case "nearby":
      //   return <NearbyPage properties={properties} />
      // case "list":
      //   return <ListPage onOpenModal={handleOpenModal} properties={properties} />
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
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProperties.map((property) => (
                  <Card
                    key={property.id}
                    className="group overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border-0 shadow-lg bg-white rounded-2xl cursor-pointer"
                    onClick={() => setSelectedProperty(property)}
                  >
                    {/* Enhanced Image Section */}
                    <div className="relative h-48 overflow-hidden rounded-t-2xl">
                      <ImageSlider property={property} className="h-48" />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 pointer-events-none" />
                      
                      {/* Status Badge */}
                      <Badge className={`absolute top-3 right-3 border-0 shadow-lg font-bold text-xs z-10 ${
                        property.status === 'Available' 
                          ? 'bg-emerald-500 text-white' 
                          : property.status === 'Rented' 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-slate-500 text-white'
                      }`}>
                        {property.status}
                      </Badge>
                      
                      {/* Rating Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1.5 shadow-lg z-10">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-bold text-slate-800">4.8</span>
                      </div>

                      {/* Property Type Badge */}
                      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg z-10">
                        <span className="text-xs font-bold text-slate-800 capitalize">{property.propertyType}</span>
                      </div>

                      {/* Favorite Heart Icon */}
                      <button className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-lg z-10 hover:bg-white hover:scale-110 transition-all duration-200">
                        <svg className="h-4 w-4 text-slate-600 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Compact Content Section */}
                    <CardContent className="p-4">
                      {/* Property Name & Price */}
                      <div className="mb-3">
                        <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1 line-clamp-1">{property.name}</h3>
                        <div className="flex items-center justify-between">
                          <p className="text-xl font-bold text-blue-600">{formatPrice(property.price)}</p>
                          <span className="text-xs text-slate-500 font-medium">per month</span>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 mb-3 text-slate-600">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium line-clamp-1">{property.location.address}</span>
                      </div>

                      {/* Property Details - Compact Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="flex flex-col items-center bg-slate-50 rounded-lg py-2">
                          <Bed className="h-3.5 w-3.5 text-slate-600 mb-1" />
                          <span className="text-xs font-bold text-slate-900">{property.bedrooms}</span>
                          <span className="text-xs text-slate-500">bed{property.bedrooms !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex flex-col items-center bg-slate-50 rounded-lg py-2">
                          <Bath className="h-3.5 w-3.5 text-slate-600 mb-1" />
                          <span className="text-xs font-bold text-slate-900">{property.bathrooms}</span>
                          <span className="text-xs text-slate-500">bath{property.bathrooms !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex flex-col items-center bg-slate-50 rounded-lg py-2">
                          <Car className="h-3.5 w-3.5 text-slate-600 mb-1" />
                          <span className="text-xs font-bold text-slate-900">{property.parking || 0}</span>
                          <span className="text-xs text-slate-500">parking</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">{property.description}</p>

                      {/* Amenities - Condensed */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {property.amenities.slice(0, 2).map((amenity) => (
                          <Badge key={amenity} variant="outline" className="text-xs px-2 py-0.5 border-slate-300 text-slate-700 bg-slate-50">
                            {amenity}
                          </Badge>
                        ))}
                        {property.amenities.length > 2 && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-200 text-blue-700 bg-blue-50">
                            +{property.amenities.length - 2} more
                          </Badge>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProperty(property);
                          }}
                          className="flex-1 h-9 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm shadow-md hover:shadow-lg"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="h-9 w-9 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                          <Phone className="h-4 w-4 text-slate-600" />
                        </button>
                      </div>
                    </CardContent>
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
                  enableClustering={enableClustering}
                  selectedCluster={selectedCluster}
                  onClusterChange={setSelectedCluster}
                  navigationMode={navigationMode}
                  onNavigationToggle={setNavigationMode}
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
      <header className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/title-logo (1).png"
                alt="Rentify"
                width={140}
                height={36}
                className="h-9 w-auto"
                priority
              />
              {/* Inline navbar beside logo on md+ */}
              <div className="ml-2">
                <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentPage === "home" && (
                <>
                  <button
                    onClick={handleOpenModal}
                    className="hidden md:flex items-center gap-2 px-4 h-10 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors font-semibold shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Post Property
                  </button>
                  <div className="hidden md:flex items-center rounded-full border border-slate-200 p-1 bg-white shadow-sm">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`flex items-center gap-2 px-4 h-9 rounded-full text-sm ${
                        viewMode === "grid"
                          ? "bg-purple-600 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Grid className="h-4 w-4" />
                      Grid
                    </button>
                    <button
                      onClick={() => setViewMode("map")}
                      className={`flex items-center gap-2 px-4 h-9 rounded-full text-sm ${
                        viewMode === "map"
                          ? "bg-purple-600 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Map className="h-4 w-4" />
                      Map
                    </button>
                  </div>
                  
                  {/* Clustering Toggle - only show in map view */}
                  {viewMode === "map" && (
                    <div className="hidden md:flex items-center rounded-full border border-slate-200 p-1 bg-white shadow-sm">
                      <button
                        onClick={() => setEnableClustering(!enableClustering)}
                        className={`flex items-center gap-2 px-3 h-9 rounded-full text-sm transition-colors ${
                          enableClustering
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                        title={enableClustering ? "Disable ML Clustering" : "Enable ML Clustering"}
                      >
                        <span className="text-xs">🧠</span>
                        {enableClustering ? "ML On" : "ML Off"}
                      </button>
                      
                      {/* Navigation Toggle */}
                      <button
                        onClick={() => setNavigationMode(!navigationMode)}
                        className={`flex items-center gap-2 px-3 h-9 rounded-full text-sm transition-colors ${
                          navigationMode
                            ? "bg-green-600 text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100"
                        }`}
                        title={navigationMode ? "Disable Navigation" : "Enable Navigation"}
                      >
                        <span className="text-xs">🧭</span>
                        {navigationMode ? "Nav On" : "Nav Off"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

  {/* Removed separate navbar below header to avoid duplication */}

      {currentPage === "home" && viewMode !== "map" && (
        <div className="bg-white border-b border-slate-200">
          <div className="container mx-auto px-4 py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search properties in Naga City..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-11 rounded-full border-slate-200 focus:border-purple-500 focus:ring-purple-500/20 bg-white"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 h-11 px-4 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>
            {showFilters && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6">
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

      <main className="container mx-auto px-4 py-8">
        {/* Enhanced grid header with sorting options */}
        {currentPage === "home" && viewMode === "grid" && filteredProperties.length > 0 && (
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-slate-900">
                {filteredProperties.length} {filteredProperties.length === 1 ? 'Property' : 'Properties'} Found
              </h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                {searchTerm ? `Matching "${searchTerm}"` : 'All Properties'}
              </Badge>
            </div>
            
            {/* Sort Options */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-slate-600 font-medium">Sort by:</span>
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>
        )}
        
        {renderCurrentPage()}
      </main>

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
                    <ImageSlider property={selectedProperty} className="h-64 rounded-lg" />
                  </div>
                  <div className="mt-4 h-48 rounded-lg overflow-hidden">
                    <PropertyMap
                      properties={[selectedProperty]}
                      clusters={[]}
                      center={[selectedProperty.location.longitude, selectedProperty.location.latitude]}
                      zoom={15}
                      focusOnProperty={true}
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
