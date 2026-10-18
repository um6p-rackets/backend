export const getPasswordResetTemplate = (resetLink: string): string => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
    <h2>Password Reset Request</h2>
    <p>You requested to reset your password. Click the button below to choose a new one. This link is valid for 15 minutes.</p>
    <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 20px;">
      Reset My Password
    </a>
    <p style="margin-top: 40px; font-size: 12px; color: #999;">
      If you did not request a password reset, please ignore this email.
    </p>
  </div>
`;