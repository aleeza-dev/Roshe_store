
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Products.css";

function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (
      !localStorage.getItem("adminToken") ||
      !localStorage.getItem("adminUser")
    ) {
      navigate("/admin");
      return;
    }

    loadCustomers();
  }, [navigate]);

  const loadCustomers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "https://roshe-backend.onrender.com/api/orders/customers",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load customers.");
      }

      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load customers.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin");
  };

  return (
    <div className="products-page">
      <aside className="products-sidebar">
        <div className="products-sidebar-logo">𝚁𝙾𝚂𝙷𝙴<span>.</span></div>
        <p className="products-sidebar-label">ADMIN PANEL</p>

        <nav className="products-nav">
          <button onClick={() => navigate("/admin/dashboard")}>▦ Dashboard</button>
          <button onClick={() => navigate("/admin/products")}>◫ Products</button>
          <button onClick={() => navigate("/admin/orders")}>▤ Orders</button>
          <button className="active">♡ Customers</button>
        </nav>

        <button className="products-logout" onClick={logout}>↪ Logout</button>
      </aside>

      <main className="products-main">
        <header className="products-topbar">
          <div>
            <p className="products-small-title">STORE MANAGEMENT</p>
            <h1>Customers</h1>
          </div>

          <button className="add-product-btn" onClick={loadCustomers}>
            ↻ Refresh
          </button>
        </header>

        {error && (
          <div role="alert" style={messageStyle}>{error}</div>
        )}

        <section className="products-summary">
          <div className="products-summary-card">
            <div className="products-summary-icon">♡</div>
            <div>
              <p>Total Customers</p>
              <h2>{customers.length}</h2>
            </div>
          </div>
        </section>

        <section className="products-section">
          <div className="products-section-header">
            <div>
              <p className="products-small-title">CUSTOMER DIRECTORY</p>
              <h2>All Customers</h2>
            </div>
            <span className="product-count">{customers.length} Customers</span>
          </div>

          {loading ? (
            <div className="products-empty">Loading customers...</div>
          ) : customers.length === 0 ? (
            <div className="products-empty">
              <div className="empty-icon">♡</div>
              <h3>No customers yet</h3>
              <p>Customers will appear here when an order is placed or an account is registered.</p>
            </div>
          ) : (
            <div className="products-table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>City</th>
                    <th>Total Orders</th>
                    <th>Last Order</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.email}>
                      <td>
                        <strong>{customer.name || "Customer"}</strong>
                      </td>
                      <td>
                        <p>{customer.email}</p>
                        <p>{customer.phone || "—"}</p>
                      </td>
                      <td>{customer.city || "—"}</td>
                      <td>{customer.orders || 0}</td>
                      <td>
                        {customer.lastOrderAt
                          ? new Date(customer.lastOrderAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        {customer.registeredAt ? "Registered" : "Guest"}
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

const messageStyle = {
  marginBottom: "16px",
  padding: "12px 16px",
  borderRadius: "6px",
  background: "#fcebea",
  color: "#9b2828",
};

export default Customers;
