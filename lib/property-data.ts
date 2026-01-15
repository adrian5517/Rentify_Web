export interface Property {
  _id?: string // MongoDB ID
  id?: string // Frontend compatibility
  name: string
  description: string
  price: number
  images: string[]
  status: "available" | "For rent" | "For sale" | "fully booked"
  amenities: string[]
  bedrooms?: number // Optional for frontend display
  bathrooms?: number // Optional for frontend display
  parking?: number // Optional for frontend display
  propertyType: 'apartment' | 'house' | 'condo' | 'room' | 'dorm' | 'boarding house' | 'other'
  location: {
    address: string
    latitude: number
    longitude: number
  }
  phoneNumber?: string
  rating?: number
  postedBy?: string | { // Can be ObjectId string or populated User object
    _id: string
    username: string
    email: string
    fullName?: string
    name?: string
    profilePicture?: string
    phoneNumber?: string
    phone?: string
  }
  createdBy?: string | {
    _id: string
    username: string
    email: string
    fullName?: string
    name?: string
    profilePicture?: string
    phoneNumber?: string
    phone?: string
  }
  createdAt?: string
  // Verification fields (optional)
  verification_status?: 'pending' | 'verified' | 'rejected'
  verified?: boolean
  // Legacy owner field for backward compatibility
  owner?: {
    id: string
    name: string
    profilePicture?: string
    phone?: string
    email?: string
  }
}

export const properties: Property[] = [
  {
    id: "1",
    name: "Modern Apartment in Downtown Naga",
    description:
      "Luxurious 2-bedroom apartment in the heart of Naga City. Features modern amenities, city views, and walking distance to SM City Naga and restaurants.",
    price: 15000,
    images: ["/placeholder-z364e.png", "/placeholder-1v4zw.png"],
    status: "available",
    amenities: ["Air Conditioning", "WiFi", "Parking", "Security", "Balcony", "Kitchen"],
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    propertyType: "apartment",
    location: {
      address: "Magsaysay Avenue, Naga City, Camarines Sur",
      latitude: 13.6218,
      longitude: 123.1815,
    },
    owner: {
      id: "owner1",
      name: "Maria Santos",
      profilePicture: "/placeholder-user.jpg",
      phone: "+63 912 345 6789",
      email: "maria.santos@example.com"
    }
  },
  {
    id: "2",
    name: "Cozy House in Triangulo",
    description:
      "Charming 3-bedroom house perfect for families. Located in peaceful Triangulo area with easy access to schools and the city center.",
    price: 12000,
    images: ["/placeholder-vi123.png", "/placeholder-m5zni.png"],
    status: "available",
    amenities: ["Garden", "Garage", "Security Gate", "Covered Patio", "Kitchen", "WiFi"],
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    propertyType: "house",
    location: {
      address: "Triangulo, Naga City, Camarines Sur",
      latitude: 13.6195,
      longitude: 123.1889,
    },
    owner: {
      id: "owner2",
      name: "Juan Dela Cruz",
      profilePicture: "/placeholder-user.jpg",
      phone: "+63 917 234 5678",
      email: "juan.delacruz@example.com"
    }
  },
  {
    id: "3",
    name: "Riverside Villa in Sabang",
    description:
      "Beautiful riverside property with scenic views of Naga River. Perfect for those who love nature and tranquility while staying in the city.",
    price: 25000,
    images: ["/placeholder-qjccm.png", "/placeholder-he1jt.png"],
    status: "available",
    amenities: ["River View", "Garden", "Outdoor Kitchen", "Parking", "Security", "Balcony"],
    bedrooms: 4,
    bathrooms: 3,
    parking: 3,
    propertyType: "house",
    location: {
      address: "Sabang, Naga City, Camarines Sur",
      latitude: 13.6156,
      longitude: 123.1756,
    },
    owner: {
      id: "owner3",
      name: "Ana Reyes",
      profilePicture: "/placeholder-user.jpg",
      phone: "+63 918 345 6789",
      email: "ana.reyes@example.com"
    }
  },
  {
    id: "4",
    name: "Studio Near Ateneo de Naga",
    description:
      "Modern studio apartment perfect for students or young professionals. Walking distance to Ateneo de Naga University and local eateries.",
    price: 8000,
    images: ["/placeholder-zcuis.png", "/placeholder-gpr9q.png"],
    status: "fully booked",
    amenities: ["WiFi", "Air Conditioning", "Study Area", "Security", "Parking"],
    bedrooms: 1,
    bathrooms: 1,
    parking: 1,
    propertyType: "room",
    location: {
      address: "Near Ateneo de Naga University, Naga City, Camarines Sur",
      latitude: 13.6301,
      longitude: 123.1967,
    },
    owner: {
      id: "owner4",
      name: "Pedro Garcia",
      profilePicture: "/placeholder-user.jpg",
      phone: "+63 919 456 7890",
      email: "pedro.garcia@example.com"
    }
  },
  {
    id: "5",
    name: "Family House in Carolina",
    description:
      "Spacious 4-bedroom house in Carolina subdivision. Features modern design and family-friendly amenities with easy access to schools.",
    price: 18000,
    images: ["/placeholder-xsx0u.png", "/placeholder-2z3fk.png"],
    status: "available",
    amenities: ["Playground Access", "Security", "Garage", "Garden", "Kitchen", "WiFi"],
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    propertyType: "house",
    location: {
      address: "Carolina, Naga City, Camarines Sur",
      latitude: 13.6089,
      longitude: 123.1723,
    },
    owner: {
      id: "owner5",
      name: "Rosa Fernandez",
      profilePicture: "/placeholder-user.jpg",
      phone: "+63 920 567 8901",
      email: "rosa.fernandez@example.com"
    }
  },
  {
    id: "6",
    name: "Luxury Condo in CBD Area",
    description:
      "Premium condominium unit in Naga's Central Business District. Top-tier amenities with panoramic city views and modern facilities.",
    price: 35000,
    images: ["/placeholder-dwqgf.png", "/placeholder-oavnn.png"],
    status: "available",
    amenities: ["Elevator", "Rooftop Deck", "Gym", "Concierge", "City View", "Parking"],
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    propertyType: "condo",
    location: {
      address: "Central Business District, Naga City, Camarines Sur",
      latitude: 13.6234,
      longitude: 123.1834,
    },
    owner: {
      id: "owner6",
      name: "Carlos Lopez",
      profilePicture: "/placeholder-user.jpg",
      phone: "+63 921 678 9012",
      email: "carlos.lopez@example.com"
    }
  },
  {
    id: "7",
    name: "Peaceful Home in Pacol",
    description:
      "Quiet family home with mountain views of Mt. Isarog. Perfect for those seeking tranquility while staying close to the city center.",
    price: 14000,
    images: ["/placeholder-p1ffn.png", "/placeholder-0ykb7.png"],
    status: "available",
    amenities: ["Garden", "Garage", "Mountain View", "Fresh Air", "Security", "Kitchen"],
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    propertyType: "house",
    location: {
      address: "Pacol, Naga City, Camarines Sur",
      latitude: 13.6445,
      longitude: 123.1678,
    },
    owner: {
      id: "owner7",
      name: "Elena Mendoza",
      profilePicture: "/placeholder-user.jpg",
      phone: "+63 922 789 0123",
      email: "elena.mendoza@example.com"
    }
  },
  {
    id: "8",
    name: "Modern Townhouse in Concepcion Grande",
    description:
      "Contemporary townhouse in well-developed Concepcion Grande area. Features premium finishes and access to community amenities.",
    price: 22000,
    images: ["/placeholder.svg?height=300&width=400", "/placeholder.svg?height=300&width=400"],
    status: "available",
    amenities: ["Swimming Pool Access", "Clubhouse", "Gym", "Security", "Parking", "Garden"],
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    propertyType: "house",
    location: {
      address: "Concepcion Grande, Naga City, Camarines Sur",
      latitude: 13.6167,
      longitude: 123.1945,
    },
    owner: {
      id: "owner8",
      name: "Miguel Torres",
      profilePicture: "/placeholder-user.jpg",
      phone: "+63 923 890 1234",
      email: "miguel.torres@example.com"
    }
  },
  {
    id: "9",
    name: "Affordable Apartment in Dayangdang",
    description:
      "Budget-friendly 2-bedroom apartment perfect for small families or working professionals. Good location with easy access to public transportation.",
    price: 10000,
    images: ["/placeholder.svg?height=300&width=400", "/placeholder.svg?height=300&width=400"],
    status: "available",
    amenities: ["WiFi", "Kitchen", "Security", "Parking", "Air Conditioning"],
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    propertyType: "apartment",
    location: {
      address: "Dayangdang, Naga City, Camarines Sur",
      latitude: 13.6278,
      longitude: 123.1712,
    },
    owner: {
      id: "owner9",
      name: "Liza Ramos",
      profilePicture: "/placeholder-user.jpg",
      phone: "+63 924 901 2345",
      email: "liza.ramos@example.com"
    }
  },
  {
    id: "10",
    name: "Spacious House in Liboton",
    description:
      "Large family home with 5 bedrooms in peaceful Liboton area. Great for big families with ample space and parking.",
    price: 20000,
    images: ["/placeholder.svg?height=300&width=400", "/placeholder.svg?height=300&width=400"],
    status: "available",
    amenities: ["Large Garden", "Multiple Parking", "Security", "Kitchen", "Living Room", "WiFi"],
    bedrooms: 5,
    bathrooms: 3,
    parking: 4,
    propertyType: "house",
    location: {
      address: "Liboton, Naga City, Camarines Sur",
      latitude: 13.6123,
      longitude: 123.1634,
    },
    owner: {
      id: "owner10",
      name: "Roberto Cruz",
      profilePicture: "/placeholder-user.jpg",
      phone: "+63 925 012 3456",
      email: "roberto.cruz@example.com"
    }
  },
]
