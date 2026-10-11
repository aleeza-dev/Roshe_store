
import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import Products from "./admin/Products";
import AddProduct from "./admin/AddProduct";
import ProductDetails from "./customer/ProductDetails";
import Checkout from "./customer/Checkout";
import Orders from "./admin/Orders";
import Customers from "./admin/Customers";
import ShippingSettings from "./admin/ShippingSettings";
import Coupons from "./admin/Coupons";

const API_URL = "https://roshe-backend.onrender.com";

function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);

  const [cart, setCart] = useState(() => {
    try {
      const savedCart = JSON.parse(
        localStorage.getItem("roshe_cart") || "[]"
      );
      return Array.isArray(savedCart) ? savedCart : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState(() => {
    try {
      const savedWishlist = JSON.parse(
        localStorage.getItem("roshe_wishlist") || "[]"
      );
      return Array.isArray(savedWishlist) ? savedWishlist : [];
    } catch {
      return [];
    }
  });

  // Fetch products from the live backend.
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/api/products`);
        if (!response.ok) {
          throw new Error("Could not fetch products");
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setProducts(data);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };

    fetchProducts();
  }, []);

  // Fetch active coupons.
  useEffect(() => {
    const fetchActiveCoupons = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/coupons/active`
        );

        if (!response.ok) {
          throw new Error("Could not fetch active coupons");
        }

        const data = await response.json();
        setActiveCoupons(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch active coupons:", error);
        setActiveCoupons([]);
      }
    };

    fetchActiveCoupons();
  }, []);

  // Save cart.
  useEffect(() => {
    localStorage.setItem("roshe_cart", JSON.stringify(cart));
  }, [cart]);

  // Save wishlist.
  useEffect(() => {
    localStorage.setItem(
      "roshe_wishlist",
      JSON.stringify(wishlist)
    );
  }, [wishlist]);

  // Open cart from ?cart=open.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("cart") === "open") {
      setCartOpen(true);
    }
  }, []);

  const showCategory = (category) => {
    setSelectedCategory(category);

    setTimeout(() => {
      document.getElementById("shop")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  // Add or remove a product from the wishlist.
  const toggleWishlist = (product) => {
    setWishlist((currentWishlist) => {
      const alreadySaved = currentWishlist.some(
        (item) => item._id === product._id
      );

      if (alreadySaved) {
        return currentWishlist.filter(
          (item) => item._id !== product._id
        );
      }

      return [...currentWishlist, product];
    });
  };

  const isWishlisted = (productId) =>
    wishlist.some((item) => item._id === productId);

  // Add a product to the cart.
  const addToCart = (product) => {
    setCartOpen(true);
    setWishlistOpen(false);

    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) =>
          item._id === product._id &&
          (item.selectedSize || "") ===
            (product.selectedSize || "") &&
          (item.selectedColor || "") ===
            (product.selectedColor || "")
      );

      if (existingProduct) {
        return currentCart.map((item) =>
          item._id === product._id &&
          (item.selectedSize || "") ===
            (product.selectedSize || "") &&
          (item.selectedColor || "") ===
            (product.selectedColor || "")
            ? {
                ...item,
                quantity: Number(item.quantity || 1) + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: Number(product.quantity || 1),
        },
      ];
    });
  };

  const increaseQuantity = (
    id,
    selectedSize = "",
    selectedColor = ""
  ) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item._id === id &&
        (item.selectedSize || "") === selectedSize &&
        (item.selectedColor || "") === selectedColor
          ? {
              ...item,
              quantity: Number(item.quantity || 1) + 1,
            }
          : item
      )
    );
  };

  const decreaseQuantity = (
    id,
    selectedSize = "",
    selectedColor = ""
  ) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item._id === id &&
          (item.selectedSize || "") === selectedSize &&
          (item.selectedColor || "") === selectedColor
            ? {
                ...item,
                quantity: Number(item.quantity || 1) - 1,
              }
            : item
        )
        .filter((item) => Number(item.quantity) > 0)
    );
  };

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) * Number(item.quantity || 1),
    0
  );

  const cartItemsCount = cart.reduce(
    (total, item) => total + Number(item.quantity || 1),
    0
  );

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter(
          (product) => product.category === selectedCategory
        );

  const newArrivals = products.filter((product) => product.isNew);

  // Reusable product card heart button.
  const renderHeartButton = (product) => {
    const saved = isWishlisted(product._id);

    return (
      <button
        type="button"
        className={`heart ${saved ? "heart-active" : ""}`}
        aria-label={
          saved ? "Remove from wishlist" : "Add to wishlist"
        }
        aria-pressed={saved}
        title={saved ? "Remove from wishlist" : "Add to wishlist"}
        onClick={(event) => {
          event.stopPropagation();
          toggleWishlist(product);
        }}
      >
        {saved ? "♥" : "♡"}
      </button>
    );
  };

  return (
    <div className="store">
      {/* ACTIVE COUPON OFFERS BAR */}
      {activeCoupons.length > 0 && (
        <div
          className="roshe-offers-bar"
          aria-label="Active promotional offers"
        >
          <div className="roshe-offers-track">
            {[...activeCoupons, ...activeCoupons].map(
              (coupon, index) => (
                <span
                  className="roshe-offer-item"
                  key={`${coupon._id || coupon.code}-${index}`}
                >
                  <span className="roshe-offer-star">✦</span>
                  <strong>{coupon.percentOff}% OFF</strong>
                  <span>USE CODE</span>
                  <span className="roshe-offer-code">
                    {coupon.code}
                  </span>

                  {Number(coupon.minOrderAmount || 0) > 0 && (
                    <span>
                      ON ORDERS ABOVE PKR{" "}
                      {Number(
                        coupon.minOrderAmount
                      ).toLocaleString()}
                    </span>
                  )}

                  <span className="roshe-offer-star">✦</span>
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <header className="navbar">
        <div className="logo">𝚁𝙾𝚂𝙷𝙴 ꨄ</div>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a
            href="#shop"
            onClick={() => setSelectedCategory("All")}
          >
            Shop
          </a>
          <a href="#new">New Arrivals</a>
          <a href="#collections">Collections</a>
          <a
            href="#promo"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById("promo")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            About
          </a>
        </nav>

        <div className="nav-icons">
          <button type="button" aria-label="Search">
            ⌕
          </button>

          <button
            type="button"
            className={`wishlist-nav-btn ${
              wishlistOpen ? "wishlist-nav-active" : ""
            }`}
            onClick={() => {
              setWishlistOpen(true);
              setCartOpen(false);
            }}
            aria-label={`Wishlist, ${wishlist.length} saved products`}
            title="My Wishlist"
          >
            {wishlist.length > 0 ? "♥" : "♡"}
            {wishlist.length > 0 && (
              <span className="wishlist-count">
                {wishlist.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className="cart-nav-btn"
            onClick={() => {
              setCartOpen(true);
              setWishlistOpen(false);
            }}
            aria-label="Shopping bag"
          >
            🛍
            {cartItemsCount > 0 && (
              <span className="cart-count">
                {cartItemsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className="menu-btn"
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </header>

      {(cartOpen || wishlistOpen) && (
        <div
          className="cart-overlay"
          onClick={() => {
            setCartOpen(false);
            setWishlistOpen(false);
          }}
        />
      )}

      {/* CART SIDEBAR */}
      <aside
        className={`cart-sidebar ${
          cartOpen ? "cart-sidebar-open" : ""
        }`}
      >
        <div className="cart-header">
          <img
            src="/check.png"
            alt="ROSHE"
            className="cart-check-image"
          />

          <button
            type="button"
            className="cart-close"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-cart-icon">🛍</div>
              <h3>Your bag is empty</h3>
              <p>
                Add something beautiful to your collection.
              </p>
            </div>
          ) : (
            <>
              {cart.map((item) => (
                <div
                  className="cart-item"
                  key={`${item._id}-${item.selectedSize || ""}-${item.selectedColor || ""}`}
                >
                  <div className="cart-item-image">
                    {item.images?.[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.name}
                      />
                    ) : (
                      <span>𝚁</span>
                    )}
                  </div>

                  <div className="cart-item-details">
                    <p>{item.category?.toUpperCase()}</p>
                    <h3>{item.name}</h3>

                    {item.selectedSize && (
                      <p>Size: {item.selectedSize}</p>
                    )}

                    {item.selectedColor && (
                      <p>Color: {item.selectedColor}</p>
                    )}

                    <strong>
                      PKR{" "}
                      {Number(item.price || 0).toLocaleString()}
                    </strong>

                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(
                            item._id,
                            item.selectedSize || "",
                            item.selectedColor || ""
                          )
                        }
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        onClick={() =>
                          increaseQuantity(
                            item._id,
                            item.selectedSize || "",
                            item.selectedColor || ""
                          )
                        }
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="cart-title">
                <span>
                  {cartItemsCount}{" "}
                  {cartItemsCount === 1 ? "item" : "items"}
                </span>
              </div>
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-bottom">
            <div className="cart-total">
              <span>Subtotal</span>
              <strong>
                PKR {cartTotal.toLocaleString()}
              </strong>
            </div>

            <button
              type="button"
              className="checkout-btn"
              onClick={() => {
                setCartOpen(false);
                setWishlistOpen(false);
                navigate("/checkout");
              }}
            >
              Checkout <span>→</span>
            </button>

            <p className="cart-note">
              Shipping and taxes calculated at checkout.
            </p>
          </div>
        )}
      </aside>

      {/* WISHLIST SIDEBAR */}
      <aside
        className={`cart-sidebar wishlist-sidebar ${
          wishlistOpen ? "cart-sidebar-open" : ""
        }`}
        aria-label="My wishlist"
        aria-hidden={!wishlistOpen}
      >
        <div className="cart-header wishlist-header">
          <div className="wishlist-heading">
            <h2>My Wishlist</h2>
            <p>
              {wishlist.length}{" "}
              {wishlist.length === 1
                ? "favourite"
                : "favourites"}
            </p>
          </div>

          <button
            type="button"
            className="cart-close"
            onClick={() => setWishlistOpen(false)}
            aria-label="Close wishlist"
          >
            ×
          </button>
        </div>

        <div className="cart-items wishlist-items">
          {wishlist.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-cart-icon wishlist-empty-icon">
                ♡
              </div>
              <h3>Your wishlist is empty</h3>
              <p>
                Tap the heart on any product to save your
                favourites here.
              </p>

              <button
                type="button"
                className="checkout-btn wishlist-shop-btn"
                onClick={() => {
                  setWishlistOpen(false);
                  document.getElementById("shop")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                Explore Collection <span>→</span>
              </button>
            </div>
          ) : (
            wishlist.map((item) => (
              <div
                className="cart-item wishlist-item"
                key={item._id}
              >
                <button
                  type="button"
                  className="wishlist-product-image"
                  onClick={() => {
                    setWishlistOpen(false);
                    navigate(`/product/${item._id}`);
                  }}
                  aria-label={`View ${item.name}`}
                >
                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.name}
                    />
                  ) : (
                    <span>𝚁</span>
                  )}
                </button>

                <div className="cart-item-details wishlist-item-details">
                  <p>{item.category?.toUpperCase()}</p>

                  <button
                    type="button"
                    className="wishlist-product-name"
                    onClick={() => {
                      setWishlistOpen(false);
                      navigate(`/product/${item._id}`);
                    }}
                  >
                    {item.name}
                  </button>

                  <strong>
                    PKR{" "}
                    {Number(item.price || 0).toLocaleString()}
                  </strong>

                  <div className="wishlist-item-actions">
                    <button
                      type="button"
                      className="wishlist-add-cart"
                      onClick={() => addToCart(item)}
                    >
                      Add to Bag +
                    </button>

                    <button
                      type="button"
                      className="wishlist-remove"
                      onClick={() => toggleWishlist(item)}
                      aria-label={`Remove ${item.name} from wishlist`}
                      title="Remove from wishlist"
                    >
                      ♥
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <main>
        {/* HERO */}
        <section className="hero" id="home">
          <div className="hero-content">
            <p className="eyebrow">NEW COLLECTION • 2026</p>

            <h1>
              Everyday style,
              <br />
              <span>beautifully simple.</span>
            </h1>

            <p className="hero-text">
              Discover timeless pieces designed to bring comfort,
              confidence and effortless style to your everyday
              wardrobe.
            </p>

            <div className="hero-buttons">
              <button
                type="button"
                className="primary-btn"
                onClick={() => showCategory("All")}
              >
                Shop Now <span>→</span>
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  document
                    .getElementById("collections")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Explore Collection
              </button>
            </div>
          </div>

          <div className="hero-image">
            <div className="image-frame">
              <img
                src="/back.jpg"
                alt="ROSHE New Collection"
                className="hero-background-image"
              />

              <div className="hero-glass">
                <p>𝚁𝙾𝚂𝙷𝙴</p>
                <span>NEW COLLECTION</span>
              </div>
            </div>

            <div className="floating-card">
              <span>01</span>
              <p>
                Fresh
                <br />
                Essentials
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="features">
          <div className="feature">
            <div className="feature-icon">✦</div>
            <div>
              <h3>Premium Quality</h3>
              <p>Carefully selected fabrics</p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">◇</div>
            <div>
              <h3>Easy Shopping</h3>
              <p>Simple & secure checkout</p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">♡</div>
            <div>
              <h3>Made For You</h3>
              <p>Styles for every moment</p>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="categories" id="collections">
          <div className="section-header">
            <div>
              <p className="section-label">SHOP YOUR STYLE</p>
              <h2>Explore Categories</h2>
            </div>
          </div>

          <div className="category-grid">
            <div className="category-card category-women">
              <img
                src="/women.jpg"
                alt="Women's Collection"
                className="category-background-image"
              />

              <div className="category-image-overlay"></div>
              <div className="category-number">01</div>

              <div className="category-content category-glass">
                <p>COLLECTION</p>
                <h3>Women</h3>
                <button
                  type="button"
                  className="category-shop-btn"
                  onClick={() => showCategory("Women")}
                >
                  Shop Now →
                </button>
              </div>
            </div>

            <div className="category-card category-accessories">
              <img
                src="/assess.jpg"
                alt="ROSHE Accessories Collection"
                className="category-background-image"
              />

              <div className="category-image-overlay"></div>
              <div className="category-number">02</div>

              <div className="category-content category-glass">
                <p>COLLECTION</p>
                <h3>Accessories</h3>
                <button
                  type="button"
                  className="category-shop-btn"
                  onClick={() => showCategory("Accessories")}
                >
                  Shop Now →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* NEW ARRIVALS */}
        <section className="new-arrivals" id="new">
          <div className="section-header centered">
            <p className="section-label">JUST IN</p>
            <h2>New Arrivals</h2>
            <p className="section-description">
              Discover our latest pieces made for the season.
            </p>
          </div>

          <div className="product-grid">
            {newArrivals.length > 0 ? (
              newArrivals.map((product) => (
                <div
                  className="product-card clickable-product-card"
                  key={product._id}
                  role="link"
                  tabIndex={0}
                  onClick={() =>
                    navigate(`/product/${product._id}`)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      navigate(`/product/${product._id}`);
                    }
                  }}
                >
                  <div className="product-image">
                    {product.isNew && (
                      <span className="badge">NEW</span>
                    )}

                    {renderHeartButton(product)}

                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                      />
                    ) : (
                      <div className="product-image-placeholder">
                        𝚁𝙾𝚂𝙷𝙴
                      </div>
                    )}
                  </div>

                  <div className="product-info">
                    <div className="product-details">
                      <p>{product.category?.toUpperCase()}</p>
                      <h3>{product.name}</h3>
                    </div>

                    <div className="product-actions">
                      <span className="product-price">
                        PKR{" "}
                        {Number(product.price).toLocaleString()}
                      </span>

                      <button
                        type="button"
                        className="add-cart-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(product);
                        }}
                      >
                        Add to Cart <span>+</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-products">
                <p>No new arrivals available yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* SHOP PRODUCTS */}
        <section className="shop-products" id="shop">
          <div className="section-header">
            <div>
              <p className="section-label">
                FIND YOUR FAVOURITES
              </p>

              <h2>
                {selectedCategory === "All"
                  ? "Shop Our Collection"
                  : selectedCategory === "Women"
                  ? "Women's Collection"
                  : "Accessories Collection"}
              </h2>
            </div>

            {selectedCategory !== "All" && (
              <button
                type="button"
                className="view-all-btn"
                onClick={() => setSelectedCategory("All")}
              >
                View All Products →
              </button>
            )}
          </div>

          <div className="product-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div
                  className="product-card clickable-product-card"
                  key={product._id}
                  role="link"
                  tabIndex={0}
                  onClick={() =>
                    navigate(`/product/${product._id}`)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      navigate(`/product/${product._id}`);
                    }
                  }}
                >
                  <div className="product-image">
                    {product.isNew && (
                      <span className="badge">NEW</span>
                    )}

                    {renderHeartButton(product)}

                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                      />
                    ) : (
                      <div className="product-image-placeholder">
                        𝚁𝙾𝚂𝙷𝙴
                      </div>
                    )}
                  </div>

                  <div className="product-info">
                    <div className="product-details">
                      <p>{product.category?.toUpperCase()}</p>
                      <h3>{product.name}</h3>
                    </div>

                    <div className="product-actions">
                      <span className="product-price">
                        PKR{" "}
                        {Number(product.price).toLocaleString()}
                      </span>

                      <button
                        type="button"
                        className="add-cart-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(product);
                        }}
                      >
                        Add to Cart <span>+</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-products">
                <p>
                  {products.length === 0
                    ? "No products available yet."
                    : `No products available in ${
                        selectedCategory === "Women"
                          ? "the Women"
                          : "the Accessories"
                      } category yet.`}
                </p>

                {selectedCategory !== "All" && (
                  <button
                    type="button"
                    className="view-all-btn"
                    onClick={() => setSelectedCategory("All")}
                  >
                    Browse All Products →
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* PROMO */}
        <section className="promo" id="promo">
          <div className="promo-shine"></div>

          <div className="promo-content">
            <div className="promo-image-wrapper">
              <img
                src="/promo.png"
                alt="ROSHE Collection"
                className="promo-image"
              />
            </div>

            <div className="promo-social-content">
              <p className="promo-label">STAY CONNECTED</p>

              <h2>
                Follow the
                <br />
                <span>ROSHE journey.</span>
              </h2>

              <p className="promo-social-text">
                Discover new collections, styling inspiration
                and everything ROSHE on our social platforms.
              </p>

              <div className="promo-social">
                <a href="#" aria-label="Instagram">
                  <img src="/insta.png" alt="Instagram" />
                </a>

                <a href="#" aria-label="WhatsApp">
                  <img src="/watsapp.png" alt="WhatsApp" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-brand">
          <h2>
            𝚁𝙾𝚂𝙷𝙴<span>.</span>
          </h2>
          <p>Timeless clothing for everyday living.</p>
        </div>

        <div className="footer-links">
          <div>
            <h4>Shop</h4>
            <a
              href="#shop"
              onClick={() => setSelectedCategory("Women")}
            >
              Women
            </a>
            <a
              href="#shop"
              onClick={() => setSelectedCategory("Accessories")}
            >
              Accessories
            </a>
          </div>

          <div>
            <h4>Help</h4>
            <a href="#contact">Contact</a>
            <a href="#contact">Shipping</a>
            <a href="#contact">Returns</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/product/:id"
          element={<ProductDetails />}
        />
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />
        <Route path="/admin/products" element={<Products />} />
        <Route
          path="/admin/add-product"
          element={<AddProduct />}
        />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/admin/orders" element={<Orders />} />
        <Route path="/admin/customers" element={<Customers />} />
        <Route
          path="/admin/shipping"
          element={<ShippingSettings />}
        />
        <Route path="/admin/coupons" element={<Coupons />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
