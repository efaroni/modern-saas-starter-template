import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth/factory'
import { z } from 'zod'

const sendVerificationSchema = z.object({
  email: z.string().email('Invalid email address')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = sendVerificationSchema.parse(body)

    const result = await authService.sendEmailVerification(email)
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Verification email sent successfully' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Send verification email error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false, 
        error: error.errors[0].message 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}