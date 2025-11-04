import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      console.error('Invalid JSON in request:', jsonError)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    // Validate that body has required fields for single property prediction
    if (!body || typeof body.price !== 'number' || typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
      console.error('Missing required fields in request. Expected: { price, latitude, longitude }. Got:', body)
      return NextResponse.json(
        { error: 'Request must contain price, latitude, and longitude' },
        { status: 400 }
      )
    }

    // Forward the request to the ML API
    const response = await fetch('https://new-train-ml.onrender.com/predict_kmeans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ML API error:', errorText)
      return NextResponse.json(
        { error: 'ML API request failed', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('ML Proxy Error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to ML API', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
