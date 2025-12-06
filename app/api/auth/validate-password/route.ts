import { NextResponse } from 'next/server'

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/
const SUGGESTED_MSG = 'Password does not meet complexity requirements. It must be at least 8 characters long and include at least one uppercase letter, one number, and one symbol.'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { password } = body || {}

    if (typeof password !== 'string') {
      return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
    }

    if (!passwordRegex.test(password)) {
      return NextResponse.json({ message: SUGGESTED_MSG }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
  }
}
