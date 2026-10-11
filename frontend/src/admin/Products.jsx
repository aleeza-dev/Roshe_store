
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Products.css";

function Products() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const user = localStorage.getItem("adminUser");

    if (!token || !user) {
      navigate("/admin");
      return;
    }

    fetchProducts();
  }, [navigate]);

  const fetchProducts = async () => {
    try {
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/products"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load products.");
      }

      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setError(error.message || "Could not load products.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    // Pass the product ID to the add-product page.
    navigate(`/admin/add-product?id=${product._id}`);
  };

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(product._id);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("adminToken");

      const response = await fetch(
        `http://localhost:5000/api/products/${product._id}`,
        {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Delete failed (HTTP ${response.status}). Check your backend route.`
        );
      }

      setProducts((currentProducts) =>
        currentProducts.filter((item) => item._id !== product._id)
      );

      setSuccess(`"${product.name}" deleted successfully.`);
    } catch (error) {
      console.error("Failed to delete product:", error);
      setError(
        error.message ||
          "Could not delete the product. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleDashboard = () => {
    navigate("/admin/dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin");
  };

  return (
    <div className="products-page">
      {/* SIDEBAR */}
      <aside className="products-sidebar">
        <div className="products-sidebar-logo">
          𝚁𝙾𝚂𝙷𝙴<span>.</span>
        </div>

        <p className="products-sidebar-label">ADMIN PANEL</p>

        <nav className="products-nav">
          <button onClick={handleDashboard}>
            <span>▦</span>
            Dashboard
          </button>

          <button className="active">
            <span>◫</span>
            Products
          </button>

          
<button type="button" onClick={() => navigate("/admin/orders")}>
  <span>▤</span>
  Orders
</button>

<button type="button" onClick={() => navigate("/admin/customers")}>
  <span>♡</span>
  Customers
</button>

        </nav>

        <button className="products-logout" onClick={handleLogout}>
          <span>↪</span>
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="products-main">
        {/* TOP BAR */}
        <header className="products-topbar">
          <div>
            <p className="products-small-title">STORE MANAGEMENT</p>
            <h1>Products</h1>
          </div>

          <button
            className="add-product-btn"
            onClick={() => navigate("/admin/add-product")}
          >
            <span>＋</span>
            Add Product
          </button>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "6px",
              background: "#fcebea",
              color: "#9b2828",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "6px",
              background: "#e5f0e8",
              color: "#315b45",
            }}
          >
            {success}
          </div>
        )}

        {/* PRODUCT SUMMARY */}
        <section className="products-summary">
          <div className="products-summary-card">
            <div className="products-summary-icon">◫</div>
            <div>
              <p>Total Products</p>
              <h2>{products.length}</h2>
            </div>
          </div>

          <div className="products-summary-card">
            <div className="products-summary-icon">◇</div>
            <div>
              <p>Women</p>
              <h2>
                {
                  products.filter(
                    (product) => product.category === "Women"
                  ).length
                }
              </h2>
            </div>
          </div>

          <div className="products-summary-card">
            <div className="products-summary-icon">♡</div>
            <div>
              <p>Accessories</p>
              <h2>
                {
                  products.filter(
                    (product) => product.category === "Accessories"
                  ).length
                }
              </h2>
            </div>
          </div>
        </section>

        {/* PRODUCTS TABLE */}
        <section className="products-section">
          <div className="products-section-header">
            <div>
              <p className="products-small-title">YOUR CATALOG</p>
              <h2>All Products</h2>
            </div>

            <span className="product-count">
              {products.length} Products
            </span>
          </div>

          {loading ? (
            <div className="products-empty">
              <div className="products-loader"></div>
              <p>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="products-empty">
              <div className="empty-icon">◫</div>
              <h3>No products yet</h3>
              <p>
                Start building your ROSHE collection by adding your first
                product.
              </p>

              <button
                className="empty-add-btn"
                onClick={() => navigate("/admin/add-product")}
              >
                ＋ Add Your First Product
              </button>
            </div>
          ) : (
            <div className="products-table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Pricing & Discount</th>
                    <th>Stock</th>
                    <th>New</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className="table-product">
                          <div className="table-product-image">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                              />
                            ) : (
                              <span>𝚁</span>
                            )}
                          </div>

                          <div>
                            <strong>{product.name}</strong>
                            <p>
                              {product.description?.slice(0, 45)}
                              {product.description?.length > 45
                                ? "..."
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="category-badge">
                          {product.category}
                        </span>
                      </td>

                                            <td>
                        {Number(product.discountPercent) > 0 ? (
                          <div>
                            <strong style={{ color: "#bd718c" }}>
                              PKR{" "}
                              {Math.round(
                                Number(product.price) *
                                  (1 - Number(product.discountPercent) / 100)
                              ).toLocaleString()}
                            </strong>

                            <p
                              style={{
                                color: "#888",
                                textDecoration: "line-through",
                                margin: "3px 0",
                                fontSize: "12px",
                              }}
                            >
                              PKR {Number(product.price || 0).toLocaleString()}
                            </p>

                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 7px",
                                borderRadius: "4px",
                                background: "#f9e1e9",
                                color: "#9b4566",
                                fontSize: "11px",
                                fontWeight: 700,
                              }}
                            >
                              {product.discountPercent}% OFF
                            </span>
                          </div>
                        ) : (
                          <strong>
                            PKR {Number(product.price || 0).toLocaleString()}
                          </strong>
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            product.stock > 0
                              ? "stock-available"
                              : "stock-out"
                          }
                        >
                          {product.stock ?? 0}
                        </span>
                      </td>

                      <td>
                        {product.isNew ? (
                          <span className="new-badge">NEW</span>
                        ) : (
                          <span className="not-new">—</span>
                        )}
                      </td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="edit-btn"
                            title="Edit Product"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => handleEdit(product)}
                            disabled={deletingId === product._id}
                          >
                            ✎
                          </button>

                          <button
                            type="button"
                            className="delete-btn"
                            title="Delete Product"
                            aria-label={`Delete ${product.name}`}
                            onClick={() => handleDelete(product)}
                            disabled={deletingId === product._id}
                          >
                            {deletingId === product._id ? "…" : "×"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Products;
