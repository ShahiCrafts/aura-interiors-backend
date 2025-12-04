const generateVerificationEmailWithCode = (name, verificationCode) => {
  return `
    <div style="font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4; padding: 40px 20px; margin: 0;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); text-align: center; padding: 0 32px;">
        
        <!-- Logo -->
        <div style="padding: 28px 0;">
          <img src="https://yourdomain.com/aura-logo.png" alt="Aura Interiors Logo" width="52" style="margin-bottom: 14px;">
        </div>

        <!-- Greeting -->
        <h2 style="font-size: 22px; font-weight: 600; color: #1a1a1a; margin: 0 0 14px;">
          Hi ${name},
        </h2>

        <p style="font-size: 14px; color: #5a5a5a; margin: 0 0 26px; line-height: 1.6;">
          Your Aura Interiors account is almost ready. Enter the verification code below to activate your account.
        </p>

        <!-- Verification Code -->
        <div style="font-size: 24px; font-weight: 700; letter-spacing: 2px; color: #111827; background-color: #f3f4f6; padding: 16px 24px; border-radius: 8px; display: inline-block; margin-bottom: 26px;">
          ${verificationCode}
        </div>

        <!-- Optional instructions -->
        <p style="font-size: 12px; color: #737373; margin: 0 0 26px; line-height: 1.5;">
          If you didn’t request this, please ignore this email.
        </p>

        <!-- Footer -->
        <div style="padding: 22px; background-color: #fafafa; font-size: 11px; color: #9d9d9d;">
          <p style="margin: 0;">
            &copy; ${new Date().getFullYear()} Aura Interiors. All rights reserved.
          </p>
          <p style="margin: 4px 0 0;">
            Need assistance?
            <a href="mailto:support@aurainteriors.com" style="color: #111827; text-decoration: none;">
              support@aurainteriors.com
            </a>
          </p>
        </div>

      </div>
    </div>
  `;
};

module.exports = { generateVerificationEmailWithCode };
