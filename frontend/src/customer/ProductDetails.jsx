import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ProductDetails.css";

const API_URL = "https://roshe-backend.onrender.com/api/products";
const CART_KEY = "roshe_cart";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load product.");
        }

        setProduct(data);
      } catch (err) {
        setError(err.message || "Unable to load product.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const reviews = product?.reviews || [];

  const averageRating =
    reviews.length > 0
      ? reviews.reduce(
          (total, review) => total + Number(review.rating || 0),
          0
        ) / reviews.length
      : 0;

  const addToCart = () => {
    if (!product) return;

    setError("");
    setCartMessage("");

    if (product.sizes?.length > 0 && !selectedSize) {
      setError("Please select a size first.");
      return;
    }

    if (product.colors?.length > 0 && !selectedColor) {
      setError("Please select a color first.");
      return;
    }

    if (Number(product.stock) <= 0) {
      setError("Sorry, this product is currently out of stock.");
      return;
    }

    try {
      const savedCart = JSON.parse(
        localStorage.getItem(CART_KEY) || "[]"
      );

      if (!Array.isArray(savedCart)) {
        throw new Error("Invalid cart data.");
      }

      const variantKey = `${selectedSize}|${selectedColor}`;

      const existingIndex = savedCart.findIndex(
        (item) =>
          item._id === product._id &&
          (item.selectedSize || "") === selectedSize &&
          (item.selectedColor || "") === selectedColor
      );

      let updatedCart;

      if (existingIndex !== -1) {
        updatedCart = savedCart.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: Number(item.quantity || 1) + 1,
              }
            : item
        );
      } else {
        updatedCart = [
          ...savedCart,
          {
            ...product,
            selectedSize,
            selectedColor,
            variantKey,
            quantity: 1,
          },
        ];
      }

      // Save the updated cart in the browser.
      localStorage.setItem(CART_KEY, JSON.stringify(updatedCart));

      // Stay on the product details page.
      setCartMessage("Added to your bag successfully!");
    } catch (err) {
      console.error("Unable to save cart:", err);
      setError("Unable to save your bag. Please try again.");
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewMessage("");

    if (!reviewComment.trim()) {
      setReviewMessage("Please write your review.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(`${API_URL}/${id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: reviewName.trim() || "Customer",
          rating,
          comment: reviewComment.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not submit review.");
      }

      setProduct((current) => ({
        ...current,
        reviews: data.reviews,
      }));

      setReviewName("");
      setReviewComment("");
      setRating(5);
      setReviewMessage("Thank you! Your review has been submitted.");
    } catch (err) {
      setReviewMessage(err.message || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="product-page-status">
        Loading product details...
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="product-page-status">
        <p>{error}</p>
        <button type="button" onClick={() => navigate("/")}>
          Back to ROSHE
        </button>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="product-detail-page">
      <header className="detail-navbar">
        <button
          type="button"
          className="detail-back"
          onClick={() => navigate("/")}
        >
          ← Back to Shop
        </button>

        <button
          type="button"
          className="detail-logo"
          onClick={() => navigate("/")}
          aria-label="ROSHE home"
        >
          𝚁𝙾𝚂𝙷𝙴<span>.</span>
        </button>

        <button
          type="button"
          className="detail-shop-link"
          onClick={() => navigate("/?cart=open")}
        >
          Shopping Bag
        </button>
      </header>

      <main className="product-detail-container">
        <div className="product-detail-image">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} />
          ) : (
            <div className="detail-image-placeholder">𝚁𝙾𝚂𝙷𝙴</div>
          )}

          {product.isNew && (
            <span className="detail-new-badge">NEW</span>
          )}
        </div>

        <section className="product-detail-info">
          <p className="detail-category">
            {product.category?.toUpperCase()}
          </p>

          <h1>{product.name}</h1>

          <p className="detail-price">
            PKR {Number(product.price).toLocaleString()}
          </p>

          <div className="detail-rating-summary">
            <span className="detail-stars">
              {"★".repeat(Math.round(averageRating))}
              {"☆".repeat(5 - Math.round(averageRating))}
            </span>

            <span>
              {reviews.length
                ? `${averageRating.toFixed(1)} (${reviews.length} ${
                    reviews.length === 1 ? "review" : "reviews"
                  })`
                : "No reviews yet"}
            </span>
          </div>

          <div className="detail-divider" />

          <h3 className="detail-description-heading">
            Product Description
          </h3>

          <p className="detail-description">
            {product.description || "More details coming soon."}
          </p>

          {product.sizes?.length > 0 && (
            <div className="detail-option">
              <div className="detail-option-heading">
                <span>Choose Size</span>
                <span>{selectedSize || "Select a size"}</span>
              </div>

              <div className="detail-size-list">
                {product.sizes.map((size) => (
                  <button
                    type="button"
                    key={size}
                    className={`detail-size-btn ${
                      selectedSize === size ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedSize(size);
                      setError("");
                      setCartMessage("");
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.colors?.length > 0 && (
            <div className="detail-option">
              <div className="detail-option-heading">
                <span>Choose Color</span>
                <span>{selectedColor || "Select a color"}</span>
              </div>

              <div className="detail-color-list">
                {product.colors.map((color) => (
                  <button
                    type="button"
                    key={color}
                    className={`detail-color-btn ${
                      selectedColor === color ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedColor(color);
                      setError("");
                      setCartMessage("");
                    }}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {typeof product.stock === "number" && (
            <p className="detail-stock">
              {product.stock > 0
                ? `${product.stock} available`
                : "Currently out of stock"}
            </p>
          )}

          {error && <p className="detail-error">{error}</p>}

          <button
            type="button"
            className="detail-add-cart"
            onClick={addToCart}
            disabled={Number(product.stock) <= 0}
          >
            {Number(product.stock) <= 0 ? "Out of Stock" : "Add to Bag"}
            <span>→</span>
          </button>

          {cartMessage && (
            <p
              className="detail-success"
              role="status"
              aria-live="polite"
            >
              {cartMessage}
            </p>
          )}

          <p className="detail-delivery-note">
            Thoughtfully selected styles, made for your everyday wardrobe.
          </p>
        </section>
      </main>

      <section className="customer-reviews">
        <div className="reviews-heading">
          <p className="section-label">CUSTOMER FEEDBACK</p>
          <h2>Reviews & Ratings</h2>
          <p>Discover what customers think about this piece.</p>
        </div>

        <div className="reviews-summary">
          <div className="reviews-average">
            <strong>
              {reviews.length ? averageRating.toFixed(1) : "—"}
            </strong>

            <div className="detail-stars">
              {"★".repeat(Math.round(averageRating))}
              {"☆".repeat(5 - Math.round(averageRating))}
            </div>

            <span>
              {reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </span>
          </div>

          <div className="reviews-list">
            {reviews.length > 0 ? (
              [...reviews]
                .sort(
                  (a, b) =>
                    new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0)
                )
                .map((review) => (
                  <article
                    className="customer-review"
                    key={review._id}
                  >
                    <div className="customer-review-top">
                      <strong>{review.name || "Customer"}</strong>

                      <span className="detail-stars">
                        {"★".repeat(
                          Math.min(5, Math.max(0, Number(review.rating) || 0))
                        )}
                        {"☆".repeat(
                          5 -
                            Math.min(
                              5,
                              Math.max(0, Number(review.rating) || 0)
                            )
                        )}
                      </span>
                    </div>

                    <p>{review.comment}</p>

                    {review.createdAt && (
                      <time>
                        {new Date(
                          review.createdAt
                        ).toLocaleDateString()}
                      </time>
                    )}
                  </article>
                ))
            ) : (
              <p className="no-reviews">
                No reviews yet. Be the first to share your experience!
              </p>
            )}
          </div>
        </div>

        <form className="review-form" onSubmit={submitReview}>
          <h3>Write a Review</h3>
          <p>
            Your feedback helps other customers discover their favourites.
          </p>

          <label htmlFor="review-name">Your name (optional)</label>
          <input
            id="review-name"
            type="text"
            maxLength={60}
            value={reviewName}
            onChange={(event) => setReviewName(event.target.value)}
            placeholder="Enter your name"
          />

          <label>Your rating</label>

          <div className="rating-picker" aria-label="Select rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                className={star <= rating ? "active" : ""}
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                onClick={() => setRating(star)}
              >
                ★
              </button>
            ))}
          </div>

          <label htmlFor="review-comment">Your review</label>
          <textarea
            id="review-comment"
            rows={4}
            maxLength={1000}
            required
            value={reviewComment}
            onChange={(event) => setReviewComment(event.target.value)}
            placeholder="Tell us what you think about this product..."
          />

          {reviewMessage && (
            <p className="review-message" role="status">
              {reviewMessage}
            </p>
          )}

          <button
            type="submit"
            className="submit-review-btn"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </section>

      <footer className="detail-footer">
        <button type="button" onClick={() => navigate("/")}>
          𝚁𝙾𝚂𝙷𝙴.
        </button>
        <span>Timeless clothing for everyday living.</span>
      </footer>
    </div>
  );
}

export default ProductDetails;
