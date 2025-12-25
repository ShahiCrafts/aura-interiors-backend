const generateVerificationEmailWithCode = (name, verificationCode) => {
  return `
    <div style="font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4; padding: 40px 20px; margin: 0;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.08); text-align: center; padding: 0 32px;">

        <!-- Logo -->
        <div style="padding: 32px 0;">
          <img src="https://aurainteriors.com/aura-logo.png" alt="Aura Interiors Logo" width="60" style="margin-bottom: 16px;">
        </div>

        <!-- Greeting -->
        <h2 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 12px;">
          Hello ${name},
        </h2>

        <p style="font-size: 16px; color: #4b5563; margin: 0 0 28px; line-height: 1.6;">
          Thank you for creating an Aura Interiors account! To get started, please verify your email address using the code below.
        </p>

        <!-- Verification Code -->
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 3px; color: #111827; background-color: #f3f4f6; padding: 18px 30px; border-radius: 12px; display: inline-block; margin-bottom: 28px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          ${verificationCode}
        </div>

        <!-- Optional instructions -->
        <p style="font-size: 14px; color: #6b7280; margin: 0 0 32px; line-height: 1.5;">
          If you did not request this email, please ignore it. The code will expire in 15 minutes.
        </p>

        <!-- Footer -->
        <div style="padding: 24px; background-color: #f9fafb; font-size: 12px; color: #9ca3af;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Aura Interiors. All rights reserved.</p>
          <p style="margin: 4px 0 0;">
            Need help?
            <a href="mailto:support@aurainteriors.com" style="color: #1f2937; text-decoration: underline;">
              Contact Support
            </a>
          </p>
        </div>

      </div>
    </div>
  `;
};

const generateOrderConfirmationEmail = (order) => {
  const {
    orderId,
    guestInfo,
    items,
    shippingAddress,
    subtotal,
    discountAmount,
    shippingCost,
    tax,
    total,
    paymentMethod,
    discountCode,
  } = order;

  const customerName = `${guestInfo.firstName} ${guestInfo.lastName}`;
  const orderDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Generate order items HTML
  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center;">
            ${
              item.image
                ? `<img src="${item.image}" alt="${item.name}" width="60" height="60" style="border-radius: 8px; object-fit: cover; margin-right: 16px;">`
                : `<div style="width: 60px; height: 60px; background-color: #f3f4f6; border-radius: 8px; margin-right: 16px;"></div>`
            }
            <div>
              <p style="margin: 0; font-weight: 600; color: #1f2937;">${item.name}</p>
              ${
                item.variant && Object.keys(item.variant).length > 0
                  ? `<p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">
                      ${Object.entries(item.variant)
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" | ")}
                    </p>`
                  : ""
              }
              <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">Qty: ${item.quantity}</p>
            </div>
          </div>
        </td>
        <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #1f2937;">
          Rs. ${(item.price * item.quantity).toLocaleString()}
        </td>
      </tr>
    `
    )
    .join("");

  // Format address
  const formatAddress = (addr) => {
    if (!addr) return "N/A";
    return `${addr.fullName}<br>${addr.addressLine1}${addr.addressLine2 ? ", " + addr.addressLine2 : ""}<br>${addr.city}, ${addr.state || ""} ${addr.postalCode}<br>${addr.country}<br>Phone: ${addr.phone}`;
  };

  return `
    <div style="font-family: 'Inter', 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f4; padding: 40px 20px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); padding: 32px; text-align: center;">
          <img src="https://aurainteriors.com/aura-logo.png" alt="Aura Interiors" width="50" style="margin-bottom: 16px; filter: brightness(0) invert(1);">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700;">Order Confirmed!</h1>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0;">Thank you for shopping with Aura Interiors</p>
        </div>

        <!-- Content -->
        <div style="padding: 32px;">

          <!-- Greeting -->
          <p style="font-size: 16px; color: #374151; margin: 0 0 24px; line-height: 1.6;">
            Hi <strong>${customerName}</strong>,<br><br>
            Great news! Your order has been confirmed and is being prepared. Here's a summary of your purchase:
          </p>

          <!-- Order Info Box -->
          <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 13px;">Order Number</span><br>
                  <strong style="color: #0d9488; font-size: 16px;">#${orderId}</strong>
                </td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="color: #6b7280; font-size: 13px;">Order Date</span><br>
                  <strong style="color: #1f2937; font-size: 14px;">${orderDate}</strong>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #6b7280; font-size: 13px;">Payment Method</span><br>
                  <strong style="color: #1f2937; font-size: 14px;">${paymentMethod === "cod" ? "Cash on Delivery" : "eSewa"}</strong>
                </td>
                <td style="padding: 8px 0; text-align: right;">
                  <span style="color: #6b7280; font-size: 13px;">Order Status</span><br>
                  <strong style="color: #0d9488; font-size: 14px;">Confirmed</strong>
                </td>
              </tr>
            </table>
          </div>

          <!-- Order Items -->
          <h3 style="font-size: 16px; font-weight: 700; color: #1f2937; margin: 0 0 16px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb;">
            Order Items
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            ${itemsHtml}
          </table>

          <!-- Order Summary -->
          <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Subtotal</td>
                <td style="padding: 8px 0; text-align: right; color: #1f2937;">Rs. ${subtotal.toLocaleString()}</td>
              </tr>
              ${
                discountAmount > 0
                  ? `<tr>
                      <td style="padding: 8px 0; color: #059669;">
                        Discount ${discountCode ? `(${discountCode.code})` : ""}
                      </td>
                      <td style="padding: 8px 0; text-align: right; color: #059669;">-Rs. ${discountAmount.toLocaleString()}</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Shipping</td>
                <td style="padding: 8px 0; text-align: right; color: #1f2937;">${shippingCost > 0 ? `Rs. ${shippingCost.toLocaleString()}` : "Free"}</td>
              </tr>
              ${
                tax > 0
                  ? `<tr>
                      <td style="padding: 8px 0; color: #6b7280;">Tax</td>
                      <td style="padding: 8px 0; text-align: right; color: #1f2937;">Rs. ${tax.toLocaleString()}</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="padding: 12px 0; font-weight: 700; color: #1f2937; border-top: 2px solid #e5e7eb;">Total</td>
                <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 18px; color: #0d9488; border-top: 2px solid #e5e7eb;">Rs. ${total.toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <!-- Shipping Address -->
          <h3 style="font-size: 16px; font-weight: 700; color: #1f2937; margin: 0 0 12px;">
            Shipping Address
          </h3>
          <div style="background-color: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
              ${formatAddress(shippingAddress)}
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/track-order?orderId=${orderId}&email=${encodeURIComponent(guestInfo.email)}"
               style="display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px;">
              Track Your Order
            </a>
          </div>

          <!-- Help Text -->
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0; line-height: 1.6;">
            If you have any questions about your order, please contact our support team at
            <a href="mailto:support@aurainteriors.com" style="color: #0d9488; text-decoration: none;">support@aurainteriors.com</a>
          </p>

        </div>

        <!-- Footer -->
        <div style="padding: 24px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
            &copy; ${new Date().getFullYear()} Aura Interiors. All rights reserved.
          </p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            You received this email because you placed an order at Aura Interiors.
          </p>
        </div>

      </div>
    </div>
  `;
};

module.exports = { generateVerificationEmailWithCode, generateOrderConfirmationEmail };
