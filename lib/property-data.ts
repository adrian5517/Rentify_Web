export interface Property {
  id: string
  name: string
  description: string
  price: number
  images: string[]
  status: "Available" | "Rented" | "Sold"
  amenities: string[]
  bedrooms: number
  bathrooms: number
  parking: number
  propertyType: string
  location: {
    address: string
    latitude: number
    longitude: number
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
    status: "Available",
    amenities: ["Air Conditioning", "WiFi", "Parking", "Security", "Balcony", "Kitchen"],
    location: {
      address: "Magsaysay Avenue, Naga City, Camarines Sur",
      latitude: 13.6218,
      longitude: 123.1815,
    },
  },
  {
    id: "2",
    name: "Cozy House in Triangulo",
    description:
      "Charming 3-bedroom house perfect for families. Located in peaceful Triangulo area with easy access to schools and the city center.",
    price: 12000,
    images: ["/placeholder-vi123.png", "/placeholder-m5zni.png"],
    status: "Available",
    amenities: ["Garden", "Garage", "Security Gate", "Covered Patio", "Kitchen", "WiFi"],
    location: {
      address: "Triangulo, Naga City, Camarines Sur",
      latitude: 13.6195,
      longitude: 123.1889,
    },
  },
  {
    id: "3",
    name: "Riverside Villa in Sabang",
    description:
      "Beautiful riverside property with scenic views of Naga River. Perfect for those who love nature and tranquility while staying in the city.",
    price: 25000,
    images: ["/placeholder-qjccm.png", "/placeholder-he1jt.png"],
    status: "Available",
    amenities: ["River View", "Garden", "Outdoor Kitchen", "Parking", "Security", "Balcony"],
    location: {
      address: "Sabang, Naga City, Camarines Sur",
      latitude: 13.6156,
      longitude: 123.1756,
    },
  },
  {
    id: "4",
    name: "Studio Near Ateneo de Naga",
    description:
      "Modern studio apartment perfect for students or young professionals. Walking distance to Ateneo de Naga University and local eateries.",
    price: 8000,
    images: ["/placeholder-zcuis.png", "/placeholder-gpr9q.png"],
    status: "Rented",
    amenities: ["WiFi", "Air Conditioning", "Study Area", "Security", "Parking"],
    location: {
      address: "Near Ateneo de Naga University, Naga City, Camarines Sur",
      latitude: 13.6301,
      longitude: 123.1967,
    },
  },
  {
    id: "5",
    name: "Family House in Carolina",
    description:
      "Spacious 4-bedroom house in Carolina subdivision. Features modern design and family-friendly amenities with easy access to schools.",
    price: 18000,
    images: ["/placeholder-xsx0u.png", "/placeholder-2z3fk.png"],
    status: "Available",
    amenities: ["Playground Access", "Security", "Garage", "Garden", "Kitchen", "WiFi"],
    location: {
      address: "Carolina, Naga City, Camarines Sur",
      latitude: 13.6089,
      longitude: 123.1723,
    },
  },
  {
    id: "6",
    name: "Luxury Condo in CBD Area",
    description:
      "Premium condominium unit in Naga's Central Business District. Top-tier amenities with panoramic city views and modern facilities.",
    price: 35000,
    images: ["/placeholder-dwqgf.png", "/placeholder-oavnn.png"],
    status: "Available",
    amenities: ["Elevator", "Rooftop Deck", "Gym", "Concierge", "City View", "Parking"],
    location: {
      address: "Central Business District, Naga City, Camarines Sur",
      latitude: 13.6234,
      longitude: 123.1834,
    },
  },
  {
    id: "7",
    name: "Peaceful Home in Pacol",
    description:
      "Quiet family home with mountain views of Mt. Isarog. Perfect for those seeking tranquility while staying close to the city center.",
    price: 14000,
    images: ["/placeholder-p1ffn.png", "/placeholder-0ykb7.png"],
    status: "Available",
    amenities: ["Garden", "Garage", "Mountain View", "Fresh Air", "Security", "Kitchen"],
    location: {
      address: "Pacol, Naga City, Camarines Sur",
      latitude: 13.6445,
      longitude: 123.1678,
    },
  },
  {
    id: "8",
    name: "Modern Townhouse in Concepcion Grande",
    description:
      "Contemporary townhouse in well-developed Concepcion Grande area. Features premium finishes and access to community amenities.",
    price: 22000,
    images: ["/placeholder.svg?height=300&width=400", "/placeholder.svg?height=300&width=400"],
    status: "Available",
    amenities: ["Swimming Pool Access", "Clubhouse", "Gym", "Security", "Parking", "Garden"],
    location: {
      address: "Concepcion Grande, Naga City, Camarines Sur",
      latitude: 13.6167,
      longitude: 123.1945,
    },
  },
  {
    id: "9",
    name: "Affordable Apartment in Dayangdang",
    description:
      "Budget-friendly 2-bedroom apartment perfect for small families or working professionals. Good location with easy access to public transportation.",
    price: 10000,
    images: ["/placeholder.svg?height=300&width=400", "/placeholder.svg?height=300&width=400"],
    status: "Available",
    amenities: ["WiFi", "Kitchen", "Security", "Parking", "Air Conditioning"],
    location: {
      address: "Dayangdang, Naga City, Camarines Sur",
      latitude: 13.6278,
      longitude: 123.1712,
    },
  },
  {
    id: "10",
    name: "Spacious House in Liboton",
    description:
      "Large family home with 5 bedrooms in peaceful Liboton area. Great for big families with ample space and parking.",
    price: 20000,
    images: ["/placeholder.svg?height=300&width=400", "/placeholder.svg?height=300&width=400"],
    status: "Available",
    amenities: ["Large Garden", "Multiple Parking", "Security", "Kitchen", "Living Room", "WiFi"],
    location: {
      address: "Liboton, Naga City, Camarines Sur",
      latitude: 13.6123,
      longitude: 123.1634,
    },
  },
]
