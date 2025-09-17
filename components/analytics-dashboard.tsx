"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts"
import { properties } from "@/lib/property-data"
import { TrendingUp, Home, DollarSign, MapPin } from "lucide-react"

export default function AnalyticsDashboard() {
  // Price range distribution data
  const priceRangeData = useMemo(() => {
    const ranges = [
      { range: "₱5K-10K", min: 5000, max: 10000, count: 0, color: "#3b82f6" },
      { range: "₱10K-15K", min: 10000, max: 15000, count: 0, color: "#06b6d4" },
      { range: "₱15K-20K", min: 15000, max: 20000, count: 0, color: "#10b981" },
      { range: "₱20K-25K", min: 20000, max: 25000, count: 0, color: "#f59e0b" },
      { range: "₱25K+", min: 25000, max: Number.POSITIVE_INFINITY, count: 0, color: "#ef4444" },
    ]

    properties.forEach((property) => {
      const range = ranges.find((r) => property.price >= r.min && property.price < r.max)
      if (range) range.count++
    })

    return ranges.filter((range) => range.count > 0)
  }, [])

  // Property status distribution
  const statusData = useMemo(() => {
    const statusCount = properties.reduce(
      (acc, property) => {
        acc[property.status] = (acc[property.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return [
      { name: "Available", value: statusCount.Available || 0, color: "#10b981" },
      { name: "Rented", value: statusCount.Rented || 0, color: "#f59e0b" },
      { name: "Sold", value: statusCount.Sold || 0, color: "#ef4444" },
    ].filter((item) => item.value > 0)
  }, [])

  // Location distribution data
  const locationData = useMemo(() => {
    const locationCount = properties.reduce(
      (acc, property) => {
        const area = property.location.address.split(",")[0].trim()
        acc[area] = (acc[area] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(locationCount)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [])

  // Monthly trend data (simulated)
  const trendData = [
    { month: "Jan", listings: 8, inquiries: 45, views: 320 },
    { month: "Feb", listings: 12, inquiries: 67, views: 480 },
    { month: "Mar", listings: 15, inquiries: 89, views: 620 },
    { month: "Apr", listings: 18, inquiries: 112, views: 750 },
    { month: "May", listings: 22, inquiries: 134, views: 890 },
    { month: "Jun", listings: 25, inquiries: 156, views: 1020 },
  ]

  const chartConfig = {
    priceRange: {
      label: "Price Range Distribution",
    },
    status: {
      label: "Property Status",
    },
    location: {
      label: "Properties by Location",
    },
    trend: {
      label: "Monthly Trends",
    },
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <TrendingUp className="h-16 w-16 mx-auto text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analytics Dashboard</h2>
        <p className="text-slate-600">Insights and trends for your property listings</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Properties</p>
                <p className="text-2xl font-bold text-blue-900">{properties.length}</p>
              </div>
              <Home className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Available</p>
                <p className="text-2xl font-bold text-green-900">
                  {properties.filter((p) => p.status === "Available").length}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Avg. Price</p>
                <p className="text-2xl font-bold text-orange-900">
                  ₱{Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Locations</p>
                <p className="text-2xl font-bold text-purple-900">{locationData.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Price Range Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Price Range Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceRangeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="range" className="text-slate-600" tick={{ fontSize: 12 }} />
                  <YAxis className="text-slate-600" tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="count" name="Properties" radius={[4, 4, 0, 0]} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Property Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-green-600" />
              Property Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm text-slate-600">{data.value} properties</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <ChartLegend
                    content={({ payload }) => (
                      <div className="flex justify-center gap-4 mt-4">
                        {payload?.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-sm text-slate-600">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Location Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              Properties by Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="horizontal" margin={{ top: 20, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis type="number" className="text-slate-600" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="area" className="text-slate-600" tick={{ fontSize: 11 }} width={70} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="count" name="Properties" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="month" className="text-slate-600" tick={{ fontSize: 12 }} />
                  <YAxis className="text-slate-600" tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="listings"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    name="New Listings"
                    dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="inquiries"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    name="Inquiries"
                    dot={{ fill: "#06b6d4", strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Page Views"
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
