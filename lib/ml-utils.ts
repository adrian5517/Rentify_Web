import type { Property } from "./property-data"

// Simple KNN implementation for property recommendations
export function getRecommendations(targetProperty: Property, allProperties: Property[], k = 3): Property[] {
  const distances = allProperties
    .filter((p) => p.id !== targetProperty.id)
    .map((property) => {
      // Calculate distance based on location and price
      const locationDistance = Math.sqrt(
        Math.pow(property.location.latitude - targetProperty.location.latitude, 2) +
          Math.pow(property.location.longitude - targetProperty.location.longitude, 2),
      )

      // Normalize price difference (divide by 10M for scaling)
      const priceDistance = Math.abs(property.price - targetProperty.price) / 10000000

      // Combined distance (weighted)
      const combinedDistance = locationDistance * 0.7 + priceDistance * 0.3

      return {
        property,
        distance: combinedDistance,
      }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k)
    .map((item) => item.property)

  return distances
}

// Define cluster result type
interface ClusterResult {
  centroid: number[]
  points: number[][]
  size: number
}

// Simple K-Means clustering for map markers
export function clusterProperties(data: number[][], k = 3): ClusterResult[] {
  if (data.length === 0) return []

  // Initialize centroids randomly
  const centroids: number[][] = []
  for (let i = 0; i < k; i++) {
    const randomIndex = Math.floor(Math.random() * data.length)
    centroids.push([...data[randomIndex]])
  }

  let clusters: number[][][] = Array(k)
    .fill(null)
    .map(() => [])
  let iterations = 0
  const maxIterations = 10

  while (iterations < maxIterations) {
    // Clear clusters
    clusters = Array(k)
      .fill(null)
      .map(() => [])

    // Assign points to nearest centroid
    data.forEach((point) => {
      let minDistance = Number.POSITIVE_INFINITY
      let clusterIndex = 0

      centroids.forEach((centroid, index) => {
        const distance = Math.sqrt(Math.pow(point[0] - centroid[0], 2) + Math.pow(point[1] - centroid[1], 2))

        if (distance < minDistance) {
          minDistance = distance
          clusterIndex = index
        }
      })

      clusters[clusterIndex].push(point)
    })

    // Update centroids
    let changed = false
    clusters.forEach((cluster, index) => {
      if (cluster.length > 0) {
        const newCentroid = [
          cluster.reduce((sum, point) => sum + point[0], 0) / cluster.length,
          cluster.reduce((sum, point) => sum + point[1], 0) / cluster.length,
          cluster.reduce((sum, point) => sum + point[2], 0) / cluster.length,
        ]

        if (
          Math.abs(newCentroid[0] - centroids[index][0]) > 0.001 ||
          Math.abs(newCentroid[1] - centroids[index][1]) > 0.001
        ) {
          changed = true
        }

        centroids[index] = newCentroid
      }
    })

    if (!changed) break
    iterations++
  }

  return clusters.map((cluster, index) => ({
    centroid: centroids[index],
    points: cluster,
    size: cluster.length,
  }))
}
