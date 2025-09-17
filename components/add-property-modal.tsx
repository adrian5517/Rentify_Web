"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Upload, MapPin, Home, DollarSign, FileText, Camera, Tag } from "lucide-react"

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddPropertyModal({ isOpen, onClose }: AddPropertyModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    address: "",
    propertyType: "",
    bedrooms: "",
    bathrooms: "",
    parking: "",
    area: "",
    images: [] as string[],
    amenities: [] as string[],
  })

  const [newAmenity, setNewAmenity] = useState("")

  const propertyTypes = ["Apartment", "House", "Condo", "Studio", "Townhouse", "Room"]
  const commonAmenities = [
    "WiFi",
    "Air Conditioning",
    "Parking",
    "Swimming Pool",
    "Gym",
    "Security",
    "Laundry",
    "Balcony",
    "Garden",
    "Elevator",
    "Pet Friendly",
    "Furnished",
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addAmenity = (amenity: string) => {
    if (amenity && !formData.amenities.includes(amenity)) {
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, amenity],
      }))
    }
    setNewAmenity("")
  }

  const removeAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenity),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the data to your backend
    console.log("Property data:", formData)
    // Reset form and close modal
    setFormData({
      name: "",
      description: "",
      price: "",
      address: "",
      propertyType: "",
      bedrooms: "",
      bathrooms: "",
      parking: "",
      area: "",
      images: [],
      amenities: [],
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Home className="h-6 w-6 text-blue-600" />
            Add New Property
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Property Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Modern 2BR Apartment"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monthly Rent (₱)
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="25000"
                required
                className="h-11"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Complete address in Naga City"
              required
              className="h-11"
            />
          </div>

          {/* Property Details */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Property Type</Label>
              <Select value={formData.propertyType} onValueChange={(value) => handleInputChange("propertyType", value)}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bedrooms" className="text-sm font-semibold text-slate-700">
                Bedrooms
              </Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => handleInputChange("bedrooms", e.target.value)}
                placeholder="2"
                min="0"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms" className="text-sm font-semibold text-slate-700">
                Bathrooms
              </Label>
              <Input
                id="bathrooms"
                type="number"
                value={formData.bathrooms}
                onChange={(e) => handleInputChange("bathrooms", e.target.value)}
                placeholder="1"
                min="0"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area" className="text-sm font-semibold text-slate-700">
                Area (sqm)
              </Label>
              <Input
                id="area"
                type="number"
                value={formData.area}
                onChange={(e) => handleInputChange("area", e.target.value)}
                placeholder="50"
                min="0"
                className="h-11"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe your property, its features, and what makes it special..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Images Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Property Images
            </Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Click to upload or drag and drop</p>
              <p className="text-sm text-slate-500">PNG, JPG up to 10MB each</p>
              <Button type="button" variant="outline" className="mt-4 bg-transparent">
                Choose Files
              </Button>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Amenities
            </Label>

            {/* Common Amenities */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {commonAmenities.map((amenity) => (
                <Button
                  key={amenity}
                  type="button"
                  variant={formData.amenities.includes(amenity) ? "default" : "outline"}
                  size="sm"
                  onClick={() => (formData.amenities.includes(amenity) ? removeAmenity(amenity) : addAmenity(amenity))}
                  className="justify-start text-sm"
                >
                  {amenity}
                </Button>
              ))}
            </div>

            {/* Custom Amenity Input */}
            <div className="flex gap-2">
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="Add custom amenity"
                className="flex-1"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity(newAmenity))}
              />
              <Button type="button" onClick={() => addAmenity(newAmenity)} disabled={!newAmenity.trim()}>
                Add
              </Button>
            </div>

            {/* Selected Amenities */}
            {formData.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                    {amenity}
                    <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => removeAmenity(amenity)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Post Property
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
