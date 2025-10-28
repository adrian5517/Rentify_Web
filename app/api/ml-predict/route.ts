import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
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
      { error: 'Failed to connect to ML API' },
      { status: 500 }
    )
  }
}
