import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendEmailCode(email: string, code: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your Verification Code</h2>
          <p style="font-size: 18px; margin: 20px 0;">
            Your verification code is: <strong style="font-size: 24px; color: #3b82f6;">${code}</strong>
          </p>
          <p style="color: #666; font-size: 14px;">
            This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated message from ${process.env.APP_NAME}. Please do not reply to this email.
          </p>
        </div>
      `,
    })
  } catch (error) {
    console.error('Failed to send email:', error)
    throw new Error('Failed to send email verification code')
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${resetToken}`
  
  try {
    await transporter.sendMail({
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p style="margin: 20px 0;">
            You requested to reset your password. Click the link below to reset it:
          </p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Reset Password
          </a>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated message from ${process.env.APP_NAME}. Please do not reply to this email.
          </p>
        </div>
      `,
    })
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}