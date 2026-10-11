import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Checkout.css";

const API_URL = "https://roshe-backend.onrender.com/api";

function Checkout() {
  const navigate = useNavigate();

  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("roshe_cart") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
  });

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState(false);

  const [freeShipping, setFreeShipping] = useState(true);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingLoaded, setShippingLoaded] = useState(false);
  const [shippingError, setShippingError] = useState("");

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [completedOrder, setCompletedOrder] = useState(null);

  // Calculate product subtotal after product discounts.
  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const originalPrice = Number(item.price || 0);
      const discountPercent = Math.min(
        90,
        Math.max(0, Number(item.discountPercent) || 0)
      );

      const discountedPrice = Math.round(
        originalPrice * (1 - discountPercent / 100)
      );

      return total + discountedPrice * Number(item.quantity || 1);
    }, 0);
  }, [cart]);

  const discountAmount = appliedCoupon
    ? Number(appliedCoupon.discountAmount || 0)
    : 0;

  const effectiveShippingFee = freeShipping ? 0 : shippingFee;
  const total = Math.max(0, subtotal - discountAmount) + effectiveShippingFee;

  const itemCount = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0
  );

  // Load shipping settings from the same endpoint as the admin page.
  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/settings/shipping`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Could not load shipping settings."
          );
        }

        if (typeof data.freeShipping !== "boolean") {
          throw new Error("Shipping settings have an invalid format.");
        }

        const fee = Number(data.shippingFee ?? 0);

        if (!Number.isFinite(fee) || fee < 0) {
          throw new Error("The saved shipping fee is invalid.");
        }

        if (!cancelled) {
          setFreeShipping(data.freeShipping);
          setShippingFee(data.freeShipping ? 0 : fee);
          setShippingError("");
        }
      } catch (error) {
        console.error("Shipping settings error:", error);

        if (!cancelled) {
          setShippingError(
            "Shipping settings could not be loaded. Please refresh the page and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setShippingLoaded(true);
        }
      }
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCustomerChange = (event) => {
    const { name, value } = event.target;

    setCustomer((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCouponInput = (event) => {
    setCouponInput(event.target.value.toUpperCase());
    setAppliedCoupon(null);
    setCouponMessage("");
    setCouponError(false);
  };

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();

    if (!code) {
      setCouponError(true);
      setCouponMessage("Please enter a coupon code.");
      return;
    }

    if (cart.length === 0) {
      setCouponError(true);
      setCouponMessage("Your shopping bag is empty.");
      return;
    }

    setCouponLoading(true);
    setCouponMessage("");
    setCouponError(false);
    setAppliedCoupon(null);

    try {
      const response = await fetch(`${API_URL}/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          subtotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to apply this coupon.");
      }

      setAppliedCoupon({
        code: data.code,
        percentOff: data.percentOff,
        discountAmount: Number(data.discountAmount || 0),
      });

      setCouponInput(data.code);
      setCouponError(false);
      setCouponMessage(data.message || "Coupon applied successfully.");
    } catch (error) {
      setCouponError(true);
      setCouponMessage(error.message || "Could not validate coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMessage("Coupon removed.");
    setCouponError(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPageError("");

    if (cart.length === 0) {
      setPageError("Your shopping bag is empty.");
      return;
    }

    if (!shippingLoaded) {
      setPageError("Please wait while shipping details load.");
      return;
    }

    if (shippingError) {
      setPageError(shippingError);
      return;
    }

    setLoading(true);

    try {
      const orderItems = cart.map((item) => ({
        productId: item._id,
        quantity: Number(item.quantity || 1),
        selectedSize: item.selectedSize || "",
        selectedColor: item.selectedColor || "",
      }));

      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            name: customer.name.trim(),
            email: customer.email.trim(),
            phone: customer.phone.trim(),
            address: customer.address.trim(),
            city: customer.city.trim(),
          },
          items: orderItems,
          couponCode: appliedCoupon?.code || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not place your order.");
      }

      localStorage.setItem("roshe_cart", JSON.stringify([]));
      setCart([]);
      setAppliedCoupon(null);
      setCouponInput("");
      setCompletedOrder(data.order);
    } catch (error) {
      setPageError(
        error.message ||
          "Something went wrong. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (completedOrder) {
    return (
      <main className="checkout-page">
        <section className="checkout-success">
          <div className="success-icon">✓</div>
          <p className="checkout-eyebrow">THANK YOU FOR SHOPPING WITH US</p>
          <h1>Your order is confirmed!</h1>
          <p>
            Thank you for choosing ROSHE. Your order has been placed
            successfully.
          </p>

          <div className="success-order-details">
            <span>Order number</span>
            <strong>{completedOrder.orderNumber}</strong>

            {completedOrder.couponCode && (
              <>
                <span>Coupon applied</span>
                <strong>{completedOrder.couponCode}</strong>
              </>
            )}

            {Number(completedOrder.discountAmount) > 0 && (
              <>
                <span>You saved</span>
                <strong className="checkout-discount">
                  − PKR{" "}
                  {Number(completedOrder.discountAmount).toLocaleString()}
                </strong>
              </>
            )}

            <span>Total payable (COD)</span>
            <strong>
              PKR {Number(completedOrder.total || 0).toLocaleString()}
            </strong>
          </div>

          <button
            className="checkout-primary-btn"
            onClick={() => navigate("/")}
          >
            Continue Shopping →
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-topbar">
        <button
          type="button"
          className="checkout-back"
          onClick={() => navigate("/")}
        >
          ← Continue Shopping
        </button>

        <button
          type="button"
          className="checkout-brand"
          onClick={() => navigate("/")}
        >
          𝚁𝙾𝚂𝙷𝙴 <span>ꨄ</span>
        </button>

        <span className="checkout-secure">Secure Checkout ♡</span>
      </div>

      <div className="checkout-heading">
        <p className="checkout-eyebrow">ALMOST YOURS</p>
        <h1>Checkout</h1>
        <p>Complete your details to place your ROSHE order.</p>
      </div>

      {cart.length === 0 ? (
        <section className="checkout-empty">
          <div className="checkout-empty-icon">♡</div>
          <h2>Your bag is empty</h2>
          <p>Find something beautiful in our latest collection.</p>

          <button
            className="checkout-primary-btn"
            onClick={() => navigate("/")}
          >
            Explore Collection →
          </button>
        </section>
      ) : (
        <form className="checkout-layout" onSubmit={handleSubmit}>
          <div className="checkout-form-column">
            <section className="checkout-card">
              <div className="checkout-section-heading">
                <span className="checkout-step">01</span>
                <div>
                  <h2>Delivery Information</h2>
                  <p>Where should we send your order?</p>
                </div>
              </div>

              <div className="checkout-fields">
                <div className="checkout-field">
                  <label htmlFor="customer-name">Full name *</label>
                  <input
                    id="customer-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={customer.name}
                    onChange={handleCustomerChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="customer-email">Email address *</label>
                  <input
                    id="customer-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={customer.email}
                    onChange={handleCustomerChange}
                    maxLength={150}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="customer-phone">Phone number *</label>
                  <input
                    id="customer-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="03XX XXXXXXX"
                    value={customer.phone}
                    onChange={handleCustomerChange}
                    maxLength={30}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="customer-city">City *</label>
                  <input
                    id="customer-city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    placeholder="Your city"
                    value={customer.city}
                    onChange={handleCustomerChange}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="checkout-field checkout-field-full">
                  <label htmlFor="customer-address">Full address *</label>
                  <textarea
                    id="customer-address"
                    name="address"
                    autoComplete="street-address"
                    placeholder="House number, street, area and delivery details"
                    value={customer.address}
                    onChange={handleCustomerChange}
                    maxLength={500}
                    rows={4}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="checkout-card">
              <div className="checkout-section-heading">
                <span className="checkout-step">02</span>
                <div>
                  <h2>Payment Method</h2>
                  <p>Pay when your order arrives.</p>
                </div>
              </div>

              <div className="checkout-payment-option">
                <span className="checkout-payment-icon">₨</span>
                <div>
                  <strong>Cash on Delivery</strong>
                  <p>Pay in cash when you receive your parcel.</p>
                </div>
                <span className="checkout-selected">✓</span>
              </div>
            </section>
          </div>

          <aside className="checkout-summary-column">
            <section className="checkout-card checkout-summary">
              <div className="checkout-summary-heading">
                <h2>Your Order</h2>
                <span>
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="checkout-order-items">
                {cart.map((item, index) => {
                  const originalPrice = Number(item.price || 0);
                  const productDiscountPercent = Math.min(
                    90,
                    Math.max(0, Number(item.discountPercent) || 0)
                  );
                  const discountedPrice = Math.round(
                    originalPrice * (1 - productDiscountPercent / 100)
                  );

                  return (
                    <div
                      className="checkout-order-item"
                      key={`${item._id}-${item.selectedSize || ""}-${item.selectedColor || ""}-${index}`}
                    >
                      <div className="checkout-order-image">
                        {item.images?.[0] ? (
                          <img src={item.images[0]} alt={item.name} />
                        ) : (
                          <span>𝚁</span>
                        )}

                        <span className="checkout-quantity-badge">
                          {item.quantity}
                        </span>
                      </div>

                      <div className="checkout-order-info">
                        <h3>{item.name}</h3>

                        {item.selectedSize && (
                          <p>Size: {item.selectedSize}</p>
                        )}

                        {item.selectedColor && (
                          <p>Color: {item.selectedColor}</p>
                        )}

                        {productDiscountPercent > 0 && (
                          <span className="checkout-product-sale">
                            {productDiscountPercent}% OFF
                          </span>
                        )}
                      </div>

                      <div className="checkout-item-prices">
                        {productDiscountPercent > 0 && (
                          <del>
                            PKR{" "}
                            {(
                              originalPrice * Number(item.quantity || 1)
                            ).toLocaleString()}
                          </del>
                        )}

                        <strong>
                          PKR{" "}
                          {(
                            discountedPrice * Number(item.quantity || 1)
                          ).toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="checkout-coupon">
                <label htmlFor="coupon-code">Have a coupon?</label>

                <div className="checkout-coupon-row">
                  <input
                    id="coupon-code"
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponInput}
                    onChange={handleCouponInput}
                    disabled={couponLoading || loading || !!appliedCoupon}
                    maxLength={30}
                  />

                  {appliedCoupon ? (
                    <button
                      type="button"
                      className="checkout-remove-coupon"
                      onClick={removeCoupon}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="checkout-apply-coupon"
                      onClick={applyCoupon}
                      disabled={couponLoading || loading}
                    >
                      {couponLoading ? "Checking..." : "Apply"}
                    </button>
                  )}
                </div>

                {couponMessage && (
                  <p
                    className={`checkout-coupon-message ${
                      couponError ? "is-error" : "is-success"
                    }`}
                    role="status"
                  >
                    {couponMessage}
                  </p>
                )}
              </div>

              <div className="checkout-price-breakdown">
                <div>
                  <span>Subtotal after product discounts</span>
                  <strong>PKR {subtotal.toLocaleString()}</strong>
                </div>

                {appliedCoupon && (
                  <div className="checkout-discount-row">
                    <span>
                      Coupon ({appliedCoupon.code} ·{" "}
                      {appliedCoupon.percentOff}% OFF)
                    </span>
                    <strong>
                      − PKR {discountAmount.toLocaleString()}
                    </strong>
                  </div>
                )}

                <div>
                  <span>Shipping</span>
                  <strong>
                    {!shippingLoaded
                      ? "Loading..."
                      : shippingError
                      ? "Unavailable"
                      : effectiveShippingFee === 0
                      ? "FREE"
                      : `PKR ${effectiveShippingFee.toLocaleString()}`}
                  </strong>
                </div>

                <div className="checkout-total-row">
                  <span>Total payable</span>
                  <strong>PKR {total.toLocaleString()}</strong>
                </div>
              </div>

              {shippingError && (
                <p className="checkout-page-error" role="alert">
                  {shippingError}
                </p>
              )}

              {pageError && (
                <p className="checkout-page-error" role="alert">
                  {pageError}
                </p>
              )}

              <button
                type="submit"
                className="checkout-primary-btn checkout-place-order"
                disabled={
                  loading ||
                  cart.length === 0 ||
                  !shippingLoaded ||
                  !!shippingError
                }
              >
                {loading
                  ? "Placing Order..."
                  : !shippingLoaded
                  ? "Loading Shipping..."
                  : shippingError
                  ? "Shipping Unavailable"
                  : "Place Order · PKR " + total.toLocaleString()}
              </button>

              <p className="checkout-terms">
                By placing your order, you confirm that your delivery
                information is correct.
              </p>
            </section>
          </aside>
        </form>
      )}
    </main>
  );
}

export default Checkout;