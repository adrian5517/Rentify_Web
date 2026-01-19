"use client"
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { useState, useEffect, useRef, useMemo } from "react"
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
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Bed,
  Bath,
} from "lucide-react"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import PropertyMap from "@/components/property-map"
import ProfilePage from "@/components/profile-page"
import Navbar from "@/components/navbar"
import { type Property } from "@/lib/property-data"
import { getRecommendations, clusterProperties } from "@/lib/ml-utils"
import AddPropertyModal from "@/components/add-property-modal"
import AuthProtected from "@/components/auth-protected"
import MessagesPage from "@/app/messages/page"
import { sendMessageAPI } from "@/lib/api"

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
  postedBy?: string | {
    _id: string
    username: string
    email: string
    fullName?: string
    profilePicture?: string
    phoneNumber?: string
    address?: string
  }
  // Optional verification fields added by backend
  verification_status?: 'pending' | 'verified' | 'rejected' | string
  verified?: boolean
  createdBy?: string | {
    _id: string
    username: string
    email: string
    fullName?: string
    profilePicture?: string
    phoneNumber?: string
    address?: string
  }
  rating?: number
  phoneNumber?: string
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
  onImageClick?: (images: string[], currentIndex: number, propertyName: string) => void
}

function ImageSlider({ property, className = "h-56", onImageClick }: ImageSliderProps) {
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

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onImageClick && property.images.length > 0) {
      onImageClick(property.images, currentImageIndex, property.name)
    }
  }

  if (totalImages === 0) {
    return (
      <div className={`${className} bg-slate-200 flex items-center justify-center rounded-t-lg`}>
        <span className="text-slate-500">No Image Available</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className} overflow-hidden group cursor-pointer`}>
      <img
        src={getImageUri(property, currentImageIndex)}
        alt={`${property.name} - Image ${currentImageIndex + 1}`}
        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        onClick={handleImageClick}
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Error'
        }}
      />
      
      {/* Zoom indicator */}
      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <svg className="h-3 w-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
        Click to zoom
      </div>
      
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

// Image Viewer/Lightbox Component
interface ImageViewerProps {
  images: string[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
  propertyName: string
}

function ImageViewer({ images, initialIndex, isOpen, onClose, propertyName }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isZoomed, setIsZoomed] = useState(false)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setIsZoomed(false)
    setImagePosition({ x: 0, y: 0 })
  }, [initialIndex, isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
    setIsZoomed(false)
    setImagePosition({ x: 0, y: 0 })
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
    setIsZoomed(false)
    setImagePosition({ x: 0, y: 0 })
  }

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isZoomed) {
      setIsZoomed(false)
      setImagePosition({ x: 0, y: 0 })
    } else {
      setIsZoomed(true)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isZoomed) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && isZoomed) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return
    
    // Prevent the event from bubbling up to other components (like modals)
    e.preventDefault()
    e.stopPropagation()
    
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowLeft':
        prevImage()
        break
      case 'ArrowRight':
        nextImage()
        break
    }
  }

  useEffect(() => {
    if (isOpen) {
      // Use capture: true to intercept events before they reach other components
      document.addEventListener('keydown', handleKeyDown, { capture: true })
      return () => document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [isOpen, currentIndex])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div>
            <h3 className="text-lg font-semibold">{propertyName}</h3>
            <p className="text-sm text-white/80">Image {currentIndex + 1} of {images.length}</p>
          </div>
          <button
            onClick={onClose}
            className="bg-black/30 hover:bg-black/50 rounded-full p-2 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              prevImage()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors z-10"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              nextImage()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors z-10"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Main Image */}
      <div className="relative max-w-full max-h-full p-8">
        <img
          src={getImageUri({ images } as Property, currentIndex)}
          alt={`${propertyName} - Image ${currentIndex + 1}`}
          className={`max-w-full max-h-full object-contain transition-transform duration-300 cursor-${isZoomed ? 'grab' : 'zoom-in'} ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{
            transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${isZoomed ? 2 : 1})`,
          }}
          onClick={handleImageClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=Image+Error'
          }}
        />
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent p-4">
        <div className="flex items-center justify-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-black/30 rounded-full px-4 py-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsZoomed(false)
                setImagePosition({ x: 0, y: 0 })
              }}
              className="text-white hover:text-blue-400 transition-colors"
              disabled={!isZoomed}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10h-6" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsZoomed(true)
              }}
              className="text-white hover:text-blue-400 transition-colors"
              disabled={isZoomed}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
          </div>

          {/* Image Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 bg-black/30 rounded-full px-4 py-2 max-w-md overflow-x-auto">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex(index)
                    setIsZoomed(false)
                    setImagePosition({ x: 0, y: 0 })
                  }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                    index === currentIndex ? 'border-white' : 'border-transparent hover:border-white/50'
                  }`}
                >
                  <img
                    src={getImageUri({ images } as Property, index)}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48x48?text=?'
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center mt-4">
          <p className="text-white/60 text-sm">
            {isZoomed ? 'Click to zoom out • Drag to pan' : 'Click to zoom in'} • Use arrow keys to navigate • Press ESC to close
          </p>
        </div>
      </div>
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





export default function PropertyListingPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [priceRange, setPriceRange] = useState([0, 50000])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState("grid")
  const [sortBy, setSortBy] = useState("newest")
  const [recommendations, setRecommendations] = useState<Property[]>([])
  const [nearbyProperties, setNearbyProperties] = useState<Property[]>([])
  const [budgetFriendly, setBudgetFriendly] = useState<Property[]>([])
  const [clusters, setClusters] = useState<any[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentPage, setCurrentPage] = useState("home")
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // New clustering state - Always enabled with "All Properties" as default
  const [selectedCluster, setSelectedCluster] = useState(3) // 3 = All Properties (new default)
  const [enableClustering, setEnableClustering] = useState(true) // Always ON
  const [navigationMode, setNavigationMode] = useState(true) // Always ON
  
  // View All filtering state
  const [activeFilter, setActiveFilter] = useState<'all' | 'nearby' | 'budget'>('all')

  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState<string[]>([])
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0)
  const [viewerPropertyName, setViewerPropertyName] = useState('')

  const openImageViewer = (images: string[], initialIndex: number, propertyName: string) => {
    setViewerImages(images)
    setViewerInitialIndex(initialIndex)
    setViewerPropertyName(propertyName)
    setImageViewerOpen(true)
  }

  const closeImageViewer = () => {
    setImageViewerOpen(false)
  }

  // Function to convert API property to Property interface
  const convertAPIProperty = (apiProperty: APIProperty): Property => {
    // Map backend status to frontend format
    let mappedStatus: "available" | "For rent" | "For sale" | "fully booked" = "available"
    if (apiProperty.status) {
      const statusLower = apiProperty.status.toLowerCase()
      if (statusLower === "available") mappedStatus = "available"
      else if (statusLower === "for rent") mappedStatus = "For rent"
      else if (statusLower === "for sale") mappedStatus = "For sale"
      else if (statusLower === "fully booked" || statusLower === "rented") mappedStatus = "fully booked"
    }

    // Map backend propertyType to frontend format
    let mappedType: 'apartment' | 'house' | 'condo' | 'room' | 'dorm' | 'boarding house' | 'other' = 'other'
    if (apiProperty.propertyType) {
      const typeLower = apiProperty.propertyType.toLowerCase()
      if (['apartment', 'house', 'condo', 'room', 'dorm', 'boarding house'].includes(typeLower)) {
        mappedType = typeLower as typeof mappedType
      }
    }

    return {
      id: apiProperty._id,
      _id: apiProperty._id,
      name: apiProperty.name,
      description: apiProperty.description,
      price: apiProperty.price,
      location: {
        address: apiProperty.location.address,
        latitude: apiProperty.location.latitude,
        longitude: apiProperty.location.longitude,
      },
      images: apiProperty.images || [],
      amenities: apiProperty.amenities || [],
      status: mappedStatus,
      propertyType: mappedType,
      bedrooms: 1, // Default values as API doesn't provide these yet
      bathrooms: 1,
      parking: (apiProperty.amenities || []).some(a => a.toLowerCase().includes('parking')) ? 1 : 0,
      createdAt: apiProperty.createdAt,
      postedBy: apiProperty.postedBy,
      createdBy: apiProperty.createdBy,
      rating: apiProperty.rating,
      phoneNumber: apiProperty.phoneNumber,
      // Map verification fields (if present)
      verification_status: (apiProperty as any).verification_status || undefined,
      verified: (apiProperty as any).verified || ((apiProperty as any).verification_status === 'verified'),
    }
  }

  // Fetch properties from API
  const fetchPropertiesFromAPI = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('https://rentify-server-ge0f.onrender.com/api/properties')
      
      if (!response.ok) {
        throw new Error('Failed to fetch properties')
      }
      
      const data = await response.json()
      // API response suppressed for privacy
      
      // Handle different response formats
      let apiProperties: APIProperty[] = []
      
      if (Array.isArray(data)) {
        // Direct array response
        apiProperties = data
      } else if (data.properties && Array.isArray(data.properties)) {
        // Object with properties array
        apiProperties = data.properties
      } else if (data.success && data.properties && Array.isArray(data.properties)) {
        // Success wrapper with properties array
        apiProperties = data.properties
      } else {
        // Unexpected API response format (details suppressed)
        throw new Error('Invalid API response format')
      }
      
      const convertedProperties = apiProperties.map(convertAPIProperty)
      setProperties(convertedProperties)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching properties:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPropertiesFromAPI()
  }, [])

  // Helper function to check if price range is not default
  const isPriceFiltered = priceRange[0] > 0 || priceRange[1] < 50000

  const filteredProperties = useMemo(() => {
    let filtered = properties.filter((property) => {
      const matchesSearch =
        property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.address.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPrice = property.price >= priceRange[0] && property.price <= priceRange[1]
      return matchesSearch && matchesPrice
    })

    // Apply active filter
    if (activeFilter === 'nearby') {
      const nearbyIds = nearbyProperties.map(p => p.id)
      filtered = filtered.filter(property => nearbyIds.includes(property.id))
    } else if (activeFilter === 'budget') {
      const budgetIds = budgetFriendly.map(p => p.id)
      filtered = filtered.filter(property => budgetIds.includes(property.id))
    }

    // Apply sorting
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "newest":
        // Sort by createdAt or id
        filtered.sort((a, b) => {
          const aId = a._id || a.id || ''
          const bId = b._id || b.id || ''
          return bId.localeCompare(aId)
        })
        break
      case "popular":
        // Sort by status (available/For rent first) then by name
        filtered.sort((a, b) => {
          const aAvailable = a.status === "available" || a.status === "For rent"
          const bAvailable = b.status === "available" || b.status === "For rent"
          if (aAvailable && !bAvailable) return -1
          if (bAvailable && !aAvailable) return 1
          return a.name.localeCompare(b.name)
        })
        break
      case "rating":
        // Random sort to simulate rating (since we don't have actual ratings)
        filtered.sort(() => Math.random() - 0.5)
        break
      default:
        break
    }

    return filtered
  }, [searchTerm, priceRange, properties, sortBy, activeFilter, nearbyProperties, budgetFriendly])

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

  // Generate nearby properties (simulate with first few available properties)
  useEffect(() => {
    if (properties.length > 0) {
      const nearby = properties
        .filter(p => p.status === "available" || p.status === "For rent")
        .slice(0, 6)
        .map(p => ({ ...p, distance: Math.random() * 2 + 0.1 })) // Simulate distance 0.1-2.1 km
      setNearbyProperties(nearby)
    }
  }, [properties])

  // Generate budget-friendly properties (lowest 25% of prices)
  useEffect(() => {
    if (properties.length > 0) {
      const sorted = [...properties].sort((a, b) => a.price - b.price)
      const budgetCount = Math.max(3, Math.floor(sorted.length * 0.25))
      setBudgetFriendly(sorted.slice(0, budgetCount).filter(p => p.status === "available" || p.status === "For rent"))
    }
  }, [properties])

  useEffect(() => {
    const authStatus = localStorage.getItem("rentify_auth")
    setIsAuthenticated(!!authStatus)
  }, [])

  const handleOpenModal = () => {
    // Opening modal (log suppressed)
    setShowAddPropertyModal(true)
  }

  const handleCloseModal = () => {
    // Closing modal (log suppressed)
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
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-purple-600 rounded-full animate-spin opacity-50" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
            </div>
            <div className="space-y-3">
              <p className="text-slate-900 text-lg font-semibold">Loading Properties</p>
              <p className="text-slate-600">Finding the perfect rentals for you...</p>
              {/* Loading progress bar */}
              <div className="w-64 h-2 bg-slate-200 rounded-full mx-auto overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-full" style={{ 
                  width: '200%',
                  animation: 'shimmer 2s ease-in-out infinite',
                  backgroundSize: '50% 100%'
                }}></div>
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
        return (
          <AuthProtected>
            <MessagesPage />
          </AuthProtected>
        )
      case "profile":
        return (
          <AuthProtected>
            <ProfilePage />
          </AuthProtected>
        )
      
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
                      
                      {/* Top-right stacked badges container for responsive layout */}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-2 z-20">
                        {property.verified || property.verification_status === 'verified' ? (
                          <Badge className="bg-emerald-600 text-white border-0 shadow-lg text-xs font-bold px-2 py-0.5" title="This listing has been verified by Rentify." aria-label="Verified listing">Verified</Badge>
                        ) : property.verification_status ? (
                          <Badge className={`border-0 shadow-lg text-xs font-bold px-2 py-0.5 ${property.verification_status === 'pending' ? 'bg-yellow-400 text-black' : 'bg-red-600 text-white'}`} title={property.verification_status === 'pending' ? 'Verification pending — documents are under review by Rentify admins.' : 'Verification rejected — the owner may need to update documents or listing details.'} aria-label={`Verification ${property.verification_status}`}>
                            {property.verification_status === 'pending' ? 'Pending' : 'Rejected'}
                          </Badge>
                        ) : null}
                      </div>

                      {/* (verification badge already rendered above in place of availability) */}
                      
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
                        {/* Verification description for non-verified listings */}
                        {!property.verified && property.verification_status && property.verification_status !== 'verified' ? (
                          <p className={`text-xs mt-1 ${property.verification_status === 'pending' ? 'text-yellow-800' : 'text-red-700'}`}>
                            {property.verification_status === 'pending'
                              ? 'Verification: Pending — documents are under review.'
                              : 'Verification: Rejected — listing may require updates from the owner.'}
                          </p>
                        ) : null}
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
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="flex flex-col items-center bg-slate-50 rounded-lg py-2">
                          <Home className="h-3.5 w-3.5 text-slate-600 mb-1" />
                          <span className="text-xs font-bold text-slate-900 capitalize">{property.propertyType}</span>
                          <span className="text-xs text-slate-500">Type</span>
                        </div>
                        <div className="flex flex-col items-center bg-slate-50 rounded-lg py-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-600 mb-1" />
                          <span className="text-xs font-bold text-slate-900">{property.createdAt ? new Date(property.createdAt).toLocaleDateString('en-US', { month: 'short' }) : 'New'}</span>
                          <span className="text-xs text-slate-500">Listed</span>
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
              <div className="text-center py-24">
                <div className="relative mx-auto mb-12 max-w-md">
                  {/* Enhanced empty state illustration */}
                  <div className="w-40 h-40 mx-auto bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                    <Search className="h-20 w-20 text-slate-400" />
                    {/* Animated search waves */}
                    <div className="absolute inset-0 rounded-full border-4 border-blue-300 opacity-30 animate-ping"></div>
                    <div className="absolute inset-4 rounded-full border-4 border-purple-300 opacity-20 animate-ping" style={{ animationDelay: '1s' }}></div>
                  </div>
                  
                  {/* Floating elements with emojis */}
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 -translate-y-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full animate-float flex items-center justify-center text-lg" style={{ animationDelay: '0s' }}>🏠</div>
                  </div>
                  <div className="absolute top-16 right-1/3 transform translate-x-4">
                    <div className="w-6 h-6 bg-purple-100 rounded-full animate-float flex items-center justify-center text-sm" style={{ animationDelay: '1s' }}>🔍</div>
                  </div>
                  <div className="absolute bottom-16 left-1/3 transform -translate-x-4">
                    <div className="w-5 h-5 bg-emerald-100 rounded-full animate-float flex items-center justify-center text-xs" style={{ animationDelay: '2s' }}>📍</div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-slate-900 text-3xl font-bold mb-3">🤔 No Properties Found</h3>
                      <p className="text-slate-600 text-lg leading-relaxed max-w-lg mx-auto">
                        We couldn't find any properties matching your search criteria. 
                        Don't worry - let's help you find what you're looking for!
                      </p>
                    </div>
                    
                    {/* Helpful suggestions */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-100 max-w-2xl mx-auto">
                      <h4 className="font-bold text-slate-800 mb-4 text-lg">💡 Try these suggestions:</h4>
                      <div className="grid gap-3 md:grid-cols-2 text-left">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🔍</span>
                          <span className="text-slate-700">Check your spelling</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">💰</span>
                          <span className="text-slate-700">Adjust price range</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📍</span>
                          <span className="text-slate-700">Try different locations</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">✨</span>
                          <span className="text-slate-700">Browse all properties</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-4 justify-center mt-8">
                      <Button
                        variant="outline"
                        size="lg"
                        className="text-blue-600 border-2 border-blue-300 hover:bg-blue-50 font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-all duration-300"
                        onClick={() => {
                          setSearchTerm("")
                          setActiveFilter('all')
                        }}
                      >
                        🔍 Clear Search
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="text-purple-600 border-2 border-purple-300 hover:bg-purple-50 font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-all duration-300"
                        onClick={() => {
                          setPriceRange([0, 50000000])
                          setActiveFilter('all')
                        }}
                      >
                        💰 Reset Budget
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="text-emerald-600 border-2 border-emerald-300 hover:bg-emerald-50 font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-all duration-300"
                        onClick={handleOpenModal}
                      >
                        🏠 List Your Property
                      </Button>
                    </div>
                    
                    {/* Quick stats to encourage exploration */}
                    <div className="mt-12 p-6 bg-slate-50 rounded-2xl max-w-md mx-auto">
                      <p className="text-slate-600 text-sm mb-2">📊 Available on Rentify:</p>
                      <div className="text-2xl font-bold text-slate-800">
                        {properties.length} Total Properties
                      </div>
                      <div className="flex justify-center gap-6 mt-3 text-sm">
                        <span className="text-emerald-600 font-medium">
                          {properties.filter(p => p.status === 'available' || p.status === 'For rent').length} Available
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-amber-600 font-medium">
                          {properties.filter(p => p.status === 'fully booked' || p.status === 'For sale').length} Booked/Sale
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="relative bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Image
                src="/rentify-logo.png"
                alt="Rentify - Find Your Perfect Home"
                width={80}
                height={24}
                priority
                className="h-12 sm:h-14 md:h-17 w-auto"
                loading="eager"
              />
              <div className="hidden sm:block h-6 w-px bg-slate-300"></div>
              {/* Inline navbar with better spacing */}
              <div className="ml-1">
                <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {currentPage === "home" && (
                <>
                  {/* Add Property Button - Mobile: Icon only, Desktop: Full button */}
                  <div className="relative group">
                    <button
                      onClick={handleOpenModal}
                      aria-label="List your property"
                      className="flex items-center gap-2 px-2 sm:px-3 md:px-5 h-9 sm:h-11 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden md:inline">List Property</span>
                    </button>
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Add your property for rent
                    </div>
                  </div>
                  
                  {/* View Mode Toggle - Compact on mobile */}
                  <div className="flex items-center rounded-full border-2 border-slate-200 p-1 bg-white shadow-md">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 h-8 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                        viewMode === "grid"
                          ? "bg-purple-600 text-white shadow-md"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      title="View as grid layout"
                    >
                      <Grid className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                      <span className="hidden lg:inline">Cards</span>
                    </button>
                    <button
                      onClick={() => setViewMode("map")}
                      className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 h-8 sm:h-10 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                        viewMode === "map"
                          ? "bg-purple-600 text-white shadow-md"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      title="View on map"
                    >
                      <Map className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                      <span className="hidden lg:inline">Map</span>
                    </button>
                  </div>
                  
                  {/* Removed ML and Navigation toggles - now always enabled */}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

  {/* Removed separate navbar below header to avoid duplication */}

      {currentPage === "home" && viewMode !== "map" && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-200">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
            {/* Search Header */}
            <div className="text-center mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 sm:mb-2">Find Your Perfect Home</h1>
              <p className="text-sm sm:text-base text-slate-600">Discover amazing rental properties in Naga City</p>
            </div>
            
            <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center max-w-4xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 sm:left-4 top-1/2 h-4 sm:h-5 w-4 sm:w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by property name or location..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setActiveFilter('all') // Reset filter when searching
                  }}
                  className="pl-10 sm:pl-12 h-10 sm:h-12 rounded-xl border-slate-300 focus:border-purple-500 focus:ring-purple-500/20 bg-white shadow-sm text-sm sm:text-base placeholder:text-slate-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("")
                      setActiveFilter('all')
                    }}
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 sm:h-12 px-4 sm:px-6 rounded-xl border-2 font-medium transition-all duration-300 text-sm sm:text-base ${
                    showFilters 
                      ? 'border-purple-500 bg-purple-50 text-purple-700' 
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                  }`}
                >
                  <Filter className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                  <span className="hidden sm:inline">Price Filter</span>
                  <span className="sm:hidden">Filter</span>
                </button>
              </div>
            </div>
            
            {showFilters && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-md max-w-2xl mx-auto">
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <h3 className="text-lg font-semibold text-slate-800">Price Range Filter</h3>
                  </div>
                  <p className="text-sm text-slate-600">Find properties within your budget</p>
                </div>
                
                {/* Price Range Display */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-center">
                      <span className="text-sm text-slate-600 block">From</span>
                      <div className="text-xl font-bold text-blue-600">{formatPrice(priceRange[0])}</div>
                    </div>
                    <div className="text-slate-400 font-medium">to</div>
                    <div className="text-center">
                      <span className="text-sm text-slate-600 block">To</span>
                      <div className="text-xl font-bold text-purple-600">{formatPrice(priceRange[1])}</div>
                    </div>
                  </div>
                  
                  {/* Simplified Slider */}
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => {
                      setPriceRange(value)
                      setActiveFilter('all') // Reset filter when price changes
                    }}
                    max={50000}
                    min={0}
                    step={1000}
                    className="w-full"
                  />
                  
                  {/* Quick Price Buttons */}
                  <div className="flex gap-2 mt-4 flex-wrap justify-center">
                    {[
                      { label: "Under ₱10K", range: [0, 10000] },
                      { label: "₱10K - ₱20K", range: [10000, 20000] },
                      { label: "₱20K - ₱30K", range: [20000, 30000] },
                      { label: "Above ₱30K", range: [30000, 50000] }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setPriceRange(preset.range)}
                        className="text-xs px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-400 hover:bg-blue-50 rounded-full transition-all duration-200 text-slate-700 hover:text-blue-700 font-medium"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Reset Button */}
                <div className="text-center">
                  <button
                    onClick={() => setPriceRange([0, 50000])}
                    className="text-sm px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                  >
                    Reset to All Prices
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Search Results Section - Show at top when searching */}
        {currentPage === "home" && viewMode === "grid" && (searchTerm || activeFilter !== 'all' || isPriceFiltered) && (
          <div className="mb-8">
            {/* Search Results Header */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">
                    🔍 {searchTerm ? 'Search Results' : 
                        activeFilter === 'nearby' ? 'Nearby Properties' : 
                        activeFilter === 'budget' ? 'Budget-Friendly Options' :
                        isPriceFiltered ? 'Filtered by Price' : 'Filtered Results'}
                  </h2>
                  <p className="text-slate-600">
                    {searchTerm 
                      ? `Found ${filteredProperties.length} properties matching "${searchTerm}"` 
                      : activeFilter === 'nearby' 
                      ? `Showing ${filteredProperties.length} nearby properties`
                      : activeFilter === 'budget'
                      ? `Showing ${filteredProperties.length} budget-friendly properties`
                      : isPriceFiltered 
                      ? `Found ${filteredProperties.length} properties in ${formatPrice(priceRange[0])} - ${formatPrice(priceRange[1])} range`
                      : `Showing ${filteredProperties.length} filtered properties`
                    }
                  </p>
                </div>
              </div>
              
              {/* Active Filters Display */}
              <div className="flex flex-wrap gap-3">
                {searchTerm && (
                  <div className="flex items-center gap-2 bg-blue-100 text-blue-800 border-2 border-blue-300 font-medium px-4 py-2 rounded-full">
                    <Search className="h-4 w-4" />
                    <span>"{searchTerm}"</span>
                    <button
                      onClick={() => {
                        setSearchTerm("")
                        setActiveFilter('all')
                      }}
                      className="ml-1 hover:bg-blue-200 rounded-full p-1 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {activeFilter !== 'all' && (
                  <div className={`flex items-center gap-2 font-medium px-4 py-2 rounded-full border-2 ${
                    activeFilter === 'nearby' 
                      ? 'bg-blue-100 text-blue-800 border-blue-300' 
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    <span className="text-lg">
                      {activeFilter === 'nearby' ? '📍' : '💰'}
                    </span>
                    <span>
                      {activeFilter === 'nearby' ? 'Nearby Properties' : 'Budget-Friendly'}
                    </span>
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={`ml-1 rounded-full p-1 transition-colors ${
                        activeFilter === 'nearby' 
                          ? 'hover:bg-blue-200' 
                          : 'hover:bg-emerald-200'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                {isPriceFiltered && (
                  <div className="flex items-center gap-2 bg-purple-100 text-purple-800 border-2 border-purple-300 font-medium px-4 py-2 rounded-full">
                    <span className="text-lg">💰</span>
                    <span>{formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}</span>
                    <button
                      onClick={() => setPriceRange([0, 50000])}
                      className="ml-1 hover:bg-purple-200 rounded-full p-1 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setActiveFilter('all')
                    setSearchTerm('')
                    setPriceRange([0, 50000])
                    setSortBy('newest')
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-medium px-4 py-2 rounded-full border-2 border-slate-300 hover:border-slate-400 transition-all duration-300 flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Show All Properties
                </button>
              </div>
            </div>

            {/* Sort Options for Search Results */}
            {filteredProperties.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-slate-200 p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <span className="text-base sm:text-lg font-semibold text-slate-800">
                      {filteredProperties.length} {filteredProperties.length === 1 ? 'Property' : 'Properties'} Found
                    </span>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-emerald-500 rounded-full"></div>
                        <span className="text-slate-600">{filteredProperties.filter(p => p.status === 'available' || p.status === 'For rent').length} Available</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 bg-amber-500 rounded-full"></div>
                        <span className="text-slate-600">{filteredProperties.filter(p => p.status === 'fully booked' || p.status === 'For sale').length} Booked</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm text-slate-600 font-medium">Sort:</span>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-xs sm:text-sm border-2 border-slate-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-full sm:min-w-[140px] cursor-pointer hover:border-slate-300 transition-colors"
                    >
                      <option value="newest">✨ Latest First</option>
                      <option value="price-low">💸 Price: Low to High</option>
                      <option value="price-high">💰 Price: High to Low</option>
                      <option value="popular">🔥 Most Popular</option>
                      <option value="rating">⭐ Highest Rated</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Search Results Grid */}
            {filteredProperties.length > 0 && (
              <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6 sm:mb-8">
                {filteredProperties.map((property) => (
                  <Card
                    key={property.id}
                    className="group overflow-hidden hover:shadow-2xl hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-500 border-0 shadow-lg bg-white rounded-xl sm:rounded-2xl cursor-pointer"
                    onClick={() => setSelectedProperty(property)}
                  >
                    {/* Enhanced Image Section */}
                    <div className="relative h-44 sm:h-48 overflow-hidden rounded-t-xl sm:rounded-t-2xl">
                      <ImageSlider 
                        property={property} 
                        className="h-44 sm:h-48" 
                        onImageClick={openImageViewer}
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 pointer-events-none" />
                      
                      {/* Status Badge */}
                      <Badge className={`absolute top-2 sm:top-3 right-2 sm:right-3 border-0 shadow-lg font-bold text-xs z-10 capitalize px-2 py-0.5 sm:px-2.5 sm:py-1 ${
                        property.status === 'available' 
                          ? 'bg-emerald-500 text-white' 
                          : property.status === 'For rent' 
                          ? 'bg-blue-500 text-white'
                          : property.status === 'For sale'
                          ? 'bg-amber-500 text-white' 
                          : 'bg-slate-500 text-white'
                      }`}>
                        {property.status}
                      </Badge>
                      
                      {/* Rating Badge */}
                      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-lg z-10">
                        <Star className="h-2.5 sm:h-3 w-2.5 sm:w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-bold text-slate-800">4.8</span>
                      </div>

                      {/* Property Type Badge */}
                      <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 shadow-lg z-10">
                        <span className="text-xs font-bold text-slate-800 capitalize">{property.propertyType}</span>
                      </div>

                      {/* Favorite Heart Icon */}
                      <button className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-white/95 backdrop-blur-sm rounded-full p-1.5 sm:p-2 shadow-lg z-10 hover:bg-white hover:scale-110 transition-all duration-200">
                        <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-slate-600 hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Compact Content Section */}
                    <CardContent className="p-3 sm:p-4">
                      {/* Property Name & Price */}
                      <div className="mb-2 sm:mb-3">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight mb-1 line-clamp-1">{property.name}</h3>
                        <div className="flex items-center justify-between">
                          <p className="text-lg sm:text-xl font-bold text-blue-600">{formatPrice(property.price)}</p>
                          <span className="text-xs text-slate-500 font-medium">per month</span>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 mb-2 sm:mb-3 text-slate-600">
                        <MapPin className="h-3 sm:h-3.5 w-3 sm:w-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium line-clamp-1">{property.location.address}</span>
                      </div>

                      {/* Property Details - Compact Grid */}
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        <div className="flex flex-col items-center bg-slate-50 rounded-lg py-1.5 sm:py-2">
                          <Home className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-slate-600 mb-0.5 sm:mb-1" />
                          <span className="text-xs font-bold text-slate-900 capitalize line-clamp-1">{property.propertyType}</span>
                          <span className="text-xs text-slate-500 hidden sm:inline">Type</span>
                        </div>
                        <div className="flex flex-col items-center bg-slate-50 rounded-lg py-1.5 sm:py-2">
                          <Calendar className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-slate-600 mb-0.5 sm:mb-1" />
                          <span className="text-xs font-bold text-slate-900">{property.createdAt ? new Date(property.createdAt).toLocaleDateString('en-US', { month: 'short' }) : 'New'}</span>
                          <span className="text-xs text-slate-500 hidden sm:inline">Listed</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 mb-2 sm:mb-3 line-clamp-2 leading-relaxed">{property.description}</p>

                      {/* Amenities - Condensed */}
                      <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                        {property.amenities.slice(0, 2).map((amenity) => (
                          <Badge key={amenity} variant="outline" className="text-xs px-1.5 sm:px-2 py-0.5 border-slate-300 text-slate-700 bg-slate-50">
                            {amenity}
                          </Badge>
                        ))}
                        {property.amenities.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1.5 sm:px-2 py-0.5 border-blue-200 text-blue-700 bg-blue-50">
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
                          className="flex-1 h-8 sm:h-9 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 text-xs sm:text-sm shadow-md hover:shadow-lg"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 sm:h-9 w-8 sm:w-9 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                          <Phone className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-slate-600" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Empty Search Results */}
            {filteredProperties.length === 0 && (
              <div className="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl border-2 border-slate-100 px-4">
                <div className="w-16 sm:w-20 h-16 sm:h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <Search className="h-8 sm:h-10 w-8 sm:w-10 text-slate-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">No Results Found</h3>
                <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6 max-w-md mx-auto">
                  {searchTerm 
                    ? `We couldn't find any properties matching "${searchTerm}". Try adjusting your search terms.`
                    : `No ${activeFilter === 'nearby' ? 'nearby' : 'budget-friendly'} properties available right now.`
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                  <Button
                    onClick={() => {
                      setSearchTerm("")
                      setActiveFilter('all')
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-10 sm:h-11"
                  >
                    Clear Search
                  </Button>
                  <Button
                    onClick={() => {
                      setPriceRange([0, 50000])
                      setActiveFilter('all')
                    }}
                    variant="outline"
                    className="h-10 sm:h-11"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Recommendations Section - Only show when not searching */}
        {currentPage === "home" && viewMode === "grid" && !searchTerm && activeFilter === 'all' && !isPriceFiltered && (nearbyProperties.length > 0 || budgetFriendly.length > 0) && (
          <div className="space-y-8 mb-8">
            

            {/* Nearby Properties */}
            {nearbyProperties.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border-2 border-blue-100 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">🚶‍♀️ Close to You</h3>
                      <p className="text-slate-600 text-lg">
                        {nearbyProperties.length} properties within walking distance • Perfect for daily commute
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveFilter('nearby')
                      setSearchTerm("")
                      setSortBy("newest")
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    View All {nearbyProperties.length} Properties
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {nearbyProperties.slice(0, 3).map((property) => (
                    <Card
                      key={`nearby-${property.id}`}
                      className="group overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border-0 shadow-lg bg-white rounded-2xl cursor-pointer"
                      onClick={() => setSelectedProperty(property)}
                    >
                      <div className="relative h-40 overflow-hidden rounded-t-2xl">
                        <ImageSlider 
                          property={property} 
                          className="h-40" 
                          onImageClick={openImageViewer}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        {/* Top-right stacked badges container (nearby card) */}
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-2 z-20">
                          {property.verified || property.verification_status === 'verified' ? (
                            <Badge className="bg-emerald-600 text-white border-0 shadow-lg text-sm font-bold px-3 py-1" title="Verified listing">Verified</Badge>
                          ) : property.verification_status ? (
                            <Badge className={`border-0 shadow-lg text-sm font-bold px-3 py-1 ${property.verification_status === 'pending' ? 'bg-yellow-400 text-black' : 'bg-red-600 text-white'}`} title={property.verification_status === 'pending' ? 'Verification pending' : 'Verification rejected'}>{property.verification_status === 'pending' ? 'Pending' : 'Rejected'}</Badge>
                          ) : null}
                        </div>

                        {/* Distance badge (aligned to top-left of stacked badges) */}
                        <Badge className="absolute top-3 right-24 bg-blue-600 text-white border-0 shadow-lg text-sm font-bold px-3 py-1 z-10">
                          📍 {(property as any).distance?.toFixed(1)}km away
                        </Badge>
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
                          <span className="text-sm font-bold text-slate-800">Walking Distance</span>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-bold text-lg line-clamp-1 mb-2">{property.name}</h4>
                        <p className="text-blue-600 font-bold text-xl mb-2">{formatPrice(property.price)}</p>
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span className="text-sm text-slate-600 line-clamp-1">{property.location.address}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Home className="h-4 w-4" />
                            <span className="capitalize">{property.propertyType}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{property.createdAt ? new Date(property.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently Listed'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Budget-Friendly Properties */}
            {budgetFriendly.length > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-8 border-2 border-emerald-100 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <span className="text-4xl font-bold text-white">₱</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">🪙 Great Value Deals</h3>
                      <p className="text-slate-600 text-lg">
                        {budgetFriendly.length} affordable properties • Best value for money options
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveFilter('budget')
                      setSortBy("price-low")
                      setSearchTerm("")
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    View All {budgetFriendly.length} Deals
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {budgetFriendly.slice(0, 3).map((property) => (
                    <Card
                      key={`budget-${property.id}`}
                      className="group overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border-0 shadow-lg bg-white rounded-2xl cursor-pointer"
                      onClick={() => setSelectedProperty(property)}
                    >
                      <div className="relative h-40 overflow-hidden rounded-t-2xl">
                        <ImageSlider 
                          property={property} 
                          className="h-40" 
                          onImageClick={openImageViewer}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        {/* Top-right stacked badges container (budget card) */}
                        <div className="absolute top-3 right-3 flex flex-col items-end gap-2 z-20">
                          {property.verified || property.verification_status === 'verified' ? (
                            <Badge className="bg-emerald-600 text-white border-0 shadow-lg text-sm font-bold px-3 py-1" title="Verified listing">Verified</Badge>
                          ) : property.verification_status ? (
                            <Badge className={`border-0 shadow-lg text-sm font-bold px-3 py-1 ${property.verification_status === 'pending' ? 'bg-yellow-400 text-black' : 'bg-red-600 text-white'}`} title={property.verification_status === 'pending' ? 'Verification pending' : 'Verification rejected'}>{property.verification_status === 'pending' ? 'Pending' : 'Rejected'}</Badge>
                          ) : null}
                        </div>

                        {/* Great value badge (aligned to top-left of stacked badges) */}
                        <Badge className="absolute top-3 right-22 bg-emerald-600 text-white border-0 shadow-lg text-sm font-bold px-3 py-1 z-10">
                          💎 Great Value
                        </Badge>
                        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
                          <span className="text-sm font-bold text-emerald-700">Budget Pick</span>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-bold text-lg line-clamp-1 mb-2">{property.name}</h4>
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-emerald-600 font-bold text-xl">{formatPrice(property.price)}</p>
                          <span className="text-sm text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full font-medium">
                            Best Deal
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="h-4 w-4 text-slate-500" />
                          <span className="text-sm text-slate-600 line-clamp-1">{property.location.address}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Enhanced and User-Friendly Grid Header */}
        {currentPage === "home" && viewMode === "grid" && filteredProperties.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-8 mb-8">
            {/* Main Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-pulse"></div>
                  <h2 className="text-3xl font-bold text-slate-900">
                    {filteredProperties.length} {filteredProperties.length === 1 ? 'Property' : 'Properties'} Found
                  </h2>
                </div>
                
                {/* Current Filters Display */}
                <div className="flex flex-wrap gap-3">
                  {searchTerm && (
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 border-2 border-blue-200 font-medium px-4 py-2 rounded-full">
                      <Search className="h-4 w-4" />
                      <span>"{searchTerm}"</span>
                      <button
                        onClick={() => {
                          setSearchTerm("")
                          setActiveFilter('all')
                        }}
                        className="ml-2 hover:bg-blue-200 rounded-full p-1"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {activeFilter !== 'all' && (
                    <div className={`flex items-center gap-2 font-medium px-4 py-2 rounded-full border-2 ${
                      activeFilter === 'nearby' 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      <span className="text-lg">
                        {activeFilter === 'nearby' ? '📍' : '💰'}
                      </span>
                      <span>
                        {activeFilter === 'nearby' ? 'Nearby Properties' : 'Budget-Friendly'}
                      </span>
                      <button
                        onClick={() => setActiveFilter('all')}
                        className={`ml-2 rounded-full p-1 ${
                          activeFilter === 'nearby' 
                            ? 'hover:bg-blue-200' 
                            : 'hover:bg-emerald-200'
                        }`}
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sort Options with Better UX */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    <span className="font-medium">Sort by:</span>
                  </div>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-base border-2 border-slate-200 rounded-xl px-4 py-2.5 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 min-w-[160px] cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <option value="newest">✨ Latest First</option>
                    <option value="price-low">💸 Price: Low to High</option>
                    <option value="price-high">💰 Price: High to Low</option>
                    <option value="popular">🔥 Most Popular</option>
                    <option value="rating">⭐ Highest Rated</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Property Stats with Visual Enhancement */}
            <div className="flex items-center gap-8 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm"></div>
                <span className="text-lg font-semibold text-slate-700">
                  {filteredProperties.filter(p => p.status === 'available' || p.status === 'For rent').length} Available Now
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-amber-500 rounded-full shadow-sm"></div>
                <span className="text-lg text-slate-600">
                  {filteredProperties.filter(p => p.status === 'fully booked' || p.status === 'For sale').length} Booked/For Sale
                </span>
              </div>
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-lg font-medium text-slate-700">
                  Average: {filteredProperties.length > 0 ? formatPrice(Math.round(filteredProperties.reduce((sum, p) => sum + p.price, 0) / filteredProperties.length)) : '₱0'}
                </span>
              </div>
              
              {/* Show All Properties Button */}
              {(activeFilter !== 'all' || searchTerm) && (
                <button
                  onClick={() => {
                    setActiveFilter('all')
                    setSearchTerm('')
                    setSortBy('newest')
                  }}
                  className="ml-auto bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Show All Properties
                </button>
              )}
            </div>
          </div>
        )}
        
        {renderCurrentPage()}

      
      </main>

      <AddPropertyModal 
        isOpen={showAddPropertyModal} 
        onClose={handleCloseModal} 
        onPropertyAdded={fetchPropertiesFromAPI}
      />

      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent className="max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          {selectedProperty && (
            <>
              <DialogHeader className="pb-3 sm:pb-4">
                <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-balance pr-8 leading-tight">{selectedProperty.name}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 md:grid-cols-2">
                {/* Left Column - Images & Map */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative h-48 sm:h-56 md:h-64 rounded-lg sm:rounded-xl overflow-hidden shadow-lg ring-1 ring-black/5">
                    <ImageSlider 
                      property={selectedProperty} 
                      className="h-48 sm:h-56 md:h-64 rounded-lg sm:rounded-xl" 
                      onImageClick={openImageViewer}
                    />
                  </div>
                  <div className="h-44 sm:h-52 md:h-56 rounded-lg sm:rounded-xl overflow-hidden shadow-md ring-1 ring-black/5">
                    <PropertyMap
                      properties={[selectedProperty]}
                      clusters={[]}
                      center={[selectedProperty.location.longitude, selectedProperty.location.latitude]}
                      zoom={16}
                      focusOnProperty={true}
                    />
                  </div>
                </div>

                {/* Right Column - Details */}
                <div className="space-y-3 sm:space-y-4">
                  {/* Price & Location */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 ring-1 ring-blue-100">
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                      {formatPrice(selectedProperty.price)}
                      <span className="text-base sm:text-lg text-blue-500 font-normal">/month</span>
                    </p>
                    <div className="flex items-start gap-2 mt-2">
                      <MapPin className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-slate-700 leading-relaxed">{selectedProperty.location.address}</span>
                    </div>
                    <div className="mt-2 sm:mt-3">
                      <Badge className="bg-blue-600 text-white capitalize text-xs px-2.5 sm:px-3 py-0.5 sm:py-1">{selectedProperty.status}</Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-slate-50 rounded-lg sm:rounded-xl p-3 sm:p-4 ring-1 ring-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-2 text-sm flex items-center gap-2">
                      <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Description
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-3">{selectedProperty.description}</p>
                  </div>

                  {/* Amenities */}
                  <div className="bg-emerald-50 rounded-lg sm:rounded-xl p-3 sm:p-4 ring-1 ring-emerald-100">
                    <h4 className="font-semibold text-slate-900 mb-2 text-sm flex items-center gap-2">
                      <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Amenities
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProperty.amenities.slice(0, 6).map((amenity: string) => (
                        <Badge key={amenity} variant="outline" className="text-xs px-1.5 sm:px-2 py-0.5 bg-white border-emerald-200 text-emerald-800">
                          {amenity}
                        </Badge>
                      ))}
                      {selectedProperty.amenities.length > 6 && (
                        <Badge variant="outline" className="text-xs px-1.5 sm:px-2 py-0.5 bg-white border-emerald-200 text-emerald-800">
                          +{selectedProperty.amenities.length - 6}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Owner Information */}
                  {(selectedProperty.postedBy || selectedProperty.createdBy) && (
                    <div className="bg-purple-50 rounded-lg sm:rounded-xl p-3 sm:p-4 ring-1 ring-purple-100">
                      <h4 className="font-semibold text-slate-900 mb-2 sm:mb-3 text-sm flex items-center gap-2">
                        <svg className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Property Owner
                      </h4>
                      <div className="bg-white rounded-lg p-2.5 sm:p-3">
                        {(() => {
                          const owner = typeof selectedProperty.postedBy === 'object' ? selectedProperty.postedBy : 
                                       typeof selectedProperty.createdBy === 'object' ? selectedProperty.createdBy : null
                          
                          if (!owner) {
                            return (
                              <p className="text-xs text-slate-500">Owner information not available</p>
                            )
                          }
                          
                          return (
                            <div className="flex items-center gap-2.5 sm:gap-3">
                              {owner.profilePicture ? (
                                <img 
                                  src={owner.profilePicture.startsWith('http') ? owner.profilePicture : `https://rentify-server-ge0f.onrender.com${owner.profilePicture}`}
                                  alt={owner.fullName || owner.username}
                                  className="w-10 sm:w-12 h-10 sm:h-12 rounded-full object-cover border-2 border-purple-200 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200 flex-shrink-0">
                                  <span className="text-purple-600 font-semibold text-base sm:text-lg">
                                    {(owner.fullName || owner.username || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                                  {owner.fullName || owner.username || 'Property Owner'}
                                </p>
                                {owner.email && (
                                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                                    <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    {owner.email}
                                  </p>
                                )}
                                {owner.phoneNumber && (
                                  <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                                    <Phone className="h-3 w-3 flex-shrink-0" />
                                    {owner.phoneNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button 
                      onClick={async () => {
                        // Get owner ID from postedBy or createdBy
                        const owner = typeof selectedProperty?.postedBy === 'object' ? selectedProperty.postedBy : 
                                     typeof selectedProperty?.createdBy === 'object' ? selectedProperty.createdBy : null

                        if (!owner) {
                          await Swal.fire({ icon: 'info', title: 'Owner info', text: 'Owner information not available' })
                          return
                        }

                        // Try one-click Send Now behavior: send a greeting and open Messages
                        // Get current user id from persisted auth (fallback)
                        let senderId: string | null = null
                        try {
                          const authData = localStorage.getItem('auth-storage')
                          if (authData) {
                            const parsed = JSON.parse(authData as string)
                            const u = parsed?.state?.user
                            senderId = u?._id || u?.id || null
                          }
                        } catch (e) {
                          // ignore parse errors
                        }

                        if (!senderId) {
                          const res = await Swal.fire({ title: 'Sign in required', text: 'You need to sign in to message the owner. Would you like to sign in now?', icon: 'question', showCancelButton: true, confirmButtonText: 'Sign in', cancelButtonText: 'Cancel' })
                          if (res.isConfirmed) {
                            setCurrentPage('auth')
                            setSelectedProperty(null)
                            window.history.pushState({}, '', '/auth')
                          }
                          return
                        }

                        if (!selectedProperty) {
                          await Swal.fire({ icon: 'info', title: 'Property missing', text: 'Please select a property first.' })
                          return
                        }

                        const ownerId = (owner as any)._id || (owner as any).id
                        const prefill = `I want to rent this property: ${selectedProperty?.name || ''}`

                        try {
                          await sendMessageAPI(String(senderId), String(ownerId), prefill)
                          try { localStorage.setItem('messages-contact', String(ownerId)) } catch (e) { /* ignore */ }
                          setCurrentPage('messages')
                          setSelectedProperty(null)
                          window.history.pushState({}, '', `/messages?contact=${ownerId}`)
                        } catch (err) {
                          console.error('❌ Send Now failed', err)
                          const message = err instanceof Error ? err.message : String(err)
                          if (message.toLowerCase().includes('auth') || message.toLowerCase().includes('token')) {
                            const res2 = await Swal.fire({ title: 'Sign in required', text: 'You need to sign in to message the owner. Would you like to sign in now?', icon: 'question', showCancelButton: true, confirmButtonText: 'Sign in', cancelButtonText: 'Cancel' })
                            if (res2.isConfirmed) {
                              setCurrentPage('auth')
                              setSelectedProperty(null)
                              window.history.pushState({}, '', '/auth')
                            }
                          } else {
                            alert('Failed to send message. Please try again.')
                          }
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 text-sm h-10 sm:h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      <Phone className="h-4 w-4" />
                      Contact
                    </Button>
                    <Button 
                      onClick={async () => {
                        const owner = typeof selectedProperty.postedBy === 'object' ? selectedProperty.postedBy : 
                                     typeof selectedProperty.createdBy === 'object' ? selectedProperty.createdBy : null
                        const isAvailable = selectedProperty.status === 'available' || selectedProperty.status === 'For rent'
                        if (!isAvailable) {
                          await Swal.fire({ icon: 'info', title: 'Unavailable', text: 'This property is not currently available.' })
                          return
                        }
                        if (owner && owner._id) {
                          const prefill = `I want to rent this property: ${selectedProperty.name}`
                          setCurrentPage('messages')
                          setSelectedProperty(null)
                          window.history.pushState({}, '', `/messages?contact=${owner._id}&prefill=${encodeURIComponent(prefill)}`)
                          await Swal.fire({ icon: 'info', title: 'Owner info', text: 'Owner information not available' })
                        }
                      }}
                      className="flex-1 text-sm h-10 sm:h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                    >
                      Rent Now
                    </Button>
                  </div>
                </div>
              </div>

              {/* Recommended Properties */}
              {recommendations.length > 0 && (
                <div className="mt-4 sm:mt-5 md:mt-6 pt-4 sm:pt-5 md:pt-6 border-t">
                  <h4 className="text-sm sm:text-base font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <svg className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    You Might Also Like
                  </h4>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {recommendations.map((rec) => (
                      <Card
                        key={rec.id}
                        className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden ring-1 ring-black/5"
                        onClick={() => setSelectedProperty(rec)}
                      >
                        <div className="relative h-24 sm:h-28">
                          <img
                            src={getImageUri(rec, 0)}
                            alt={rec.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image'
                            }}
                          />
                        </div>
                        <CardContent className="p-2.5 sm:p-3">
                          <h5 className="font-semibold text-xs sm:text-sm text-slate-900 truncate">{rec.name}</h5>
                          <p className="text-blue-600 font-bold text-sm sm:text-base mt-0.5">{formatPrice(rec.price)}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{rec.location.address}</p>
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

      {/* Image Viewer Component */}
      <ImageViewer
        images={viewerImages}
        initialIndex={viewerInitialIndex}
        isOpen={imageViewerOpen}
        onClose={closeImageViewer}
        propertyName={viewerPropertyName}
      />
    </div>
  )
}