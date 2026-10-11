
const nodemailer = require("nodemailer");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

async function sendOrderConfirmationEmail(order) {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPassword) {
    throw new Error("Email credentials are missing from environment variables.");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });

  const customer = order.customer;
  const items = order.items || [];

  const itemRows = items.map((item) => {
    const options = [
      item.selectedSize ? `Size: ${escapeHtml(item.selectedSize)}` : "",
      item.selectedColor ? `Color: ${escapeHtml(item.selectedColor)}` : "",
    ].filter(Boolean).join(" | ");

    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
          <strong>${escapeHtml(item.name)}</strong>
          ${options ? `<br><small>${options}</small>` : ""}
        </td>
        <td style="padding:12px;text-align:center;border-bottom:1px solid #e5e7eb;">
          ${Number(item.quantity)}
        </td>
        <td style="padding:12px;text-align:right;border-bottom:1px solid #e5e7eb;">
          PKR ${Number(item.price * item.quantity).toLocaleString("en-PK")}
        </td>
      </tr>
    `;
  }).join("");

  const money = (amount) =>
    `PKR ${Number(amount || 0).toLocaleString("en-PK")}`;

  await transporter.sendMail({
    from: `"ROSHE" <${emailUser}>`,
    to: customer.email,
    subject: `Your ROSHE order ${order.orderNumber} has been received`,
    text: [
      `Hi ${customer.name},`,
      "",
      "Thank you for shopping with ROSHE!",
      "We've received your order.",
      `Order number: ${order.orderNumber}`,
      `Subtotal: ${money(order.subtotal)}`,
      `Shipping: ${money(order.shippingFee)}`,
      `Total (Cash on Delivery): ${money(order.total)}`,
      "",
      "Delivery details:",
      customer.address,
      customer.city,
      `Phone: ${customer.phone}`,
      "",
      "We'll keep you updated about your order.",
      "With love, ROSHE",
    ].join("\n"),
    html: `
      <div style="background:#f5f7f4;padding:30px 12px;font-family:Arial,sans-serif;color:#26352d;">
        <div style="max-width:620px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;">
          <div style="background:#dce8dc;text-align:center;padding:28px 16px;">
            <h1 style="margin:0;letter-spacing:5px;">ROSHE.</h1>
            <p style="margin-bottom:0;">YOUR ORDER, OUR CARE</p>
          </div>

          <div style="padding:24px;">
            <h2 style="margin-top:0;">Thank you, ${escapeHtml(customer.name)}!</h2>
            <p>Your order has been received successfully. We're happy you chose ROSHE.</p>

            <div style="background:#f5f7f4;padding:14px;border-radius:8px;">
              <strong>Order number:</strong><br>
              ${escapeHtml(order.orderNumber)}
            </div>

            <h3>Order summary</h3>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f5f7f4;text-align:left;">
                  <th style="padding:10px;">Product</th>
                  <th style="padding:10px;text-align:center;">Qty</th>
                  <th style="padding:10px;text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div style="margin-top:20px;text-align:right;line-height:2;">
              <div>Subtotal: ${money(order.subtotal)}</div>
              <div>Shipping: ${money(order.shippingFee)}</div>
              <div style="font-size:18px;font-weight:bold;">
                Total (Cash on Delivery): ${money(order.total)}
              </div>
            </div>

            <h3>Delivery details</h3>
            <p>
              ${escapeHtml(customer.name)}<br>
              ${escapeHtml(customer.address)}<br>
              ${escapeHtml(customer.city)}<br>
              Phone: ${escapeHtml(customer.phone)}
            </p>

            <p>Your payment method is <strong>Cash on Delivery (COD)</strong>.</p>
            <p>We'll keep you updated about your order.</p>

            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
            <p style="text-align:center;margin-bottom:0;">
              With love,<br><strong>ROSHE.</strong>
            </p>
          </div>
        </div>
      </div>


    `,
  });
  
const ownerEmail = process.env.STORE_NOTIFICATION_EMAIL;

if (ownerEmail) {
  try {
    await transporter.sendMail({
      from: `"ROSHE Orders" <${emailUser}>`,
      to: ownerEmail,
      subject: `New ROSHE Order - ${order.orderNumber}`,
      text: [
        "A new order has been placed on ROSHE!",
        "",
        `Order Number: ${order.orderNumber}`,
        `Customer Name: ${order.customer.name}`,
        `Customer Email: ${order.customer.email}`,
        `Phone: ${order.customer.phone}`,
        `Delivery Address: ${order.customer.address}, ${order.customer.city}`,
        "",
        "Ordered Products:",
        ...order.items.map(
          (item) =>
            `${item.name} | Quantity: ${item.quantity} | Price: PKR ${item.price} each`
        ),
        "",
        `Subtotal: PKR ${order.subtotal}`,
        `Shipping Fee: PKR ${order.shippingFee}`,
        `Total Amount: PKR ${order.total}`,
        "Payment Method: Cash on Delivery",
        `Order Status: ${order.status}`,
      ].join("\n"),
    });

    console.log(`Admin notification sent for ${order.orderNumber}`);
  } catch (error) {
    console.error("Admin notification email failed:", error.message);
  }
} else {
  console.error("STORE_NOTIFICATION_EMAIL is missing from .env");
}

}

module.exports = sendOrderConfirmationEmail;
