import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Check if request has a body
    const contentLength = request.headers.get('content-length')
    if (!contentLength || contentLength === '0') {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      )
    }

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
    
    // Validate that body has required properties array
    if (!body || !Array.isArray(body.properties)) {
      return NextResponse.json(
        { error: 'Request must contain properties array' },
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
