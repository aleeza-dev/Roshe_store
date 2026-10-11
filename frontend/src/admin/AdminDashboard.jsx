import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalOrders, setTotalOrders] = useState(null);
  const [totalCustomers, setTotalCustomers] = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const user = localStorage.getItem("adminUser");

    if (!token || !user) {
      navigate("/admin");
      return;
    }

    try {
      setAdmin(JSON.parse(user));
    } catch (error) {
      console.error("Failed to read admin information:", error);
      localStorage.removeItem("adminUser");
      navigate("/admin");
      return;
    }

    // Fetch total products
    const fetchProducts = async () => {
      try {
        
const response = await fetch(
  "https://roshe-backend.onrender.com/api/products"
);


        const data = await response.json();

        if (response.ok) {
          const products = Array.isArray(data)
            ? data
            : data.products || [];

          setTotalProducts(products.length);
        } else {
          console.error("Failed to fetch products:", data.message);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };

    // Fetch orders, customers and revenue statistics
    const fetchStats = async () => {
      try {
        const response = await fetch(
          "https://roshe-backend.onrender.com/api/orders/stats/summary",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          setTotalOrders(data.totalOrders ?? 0);
          setTotalCustomers(data.customers ?? 0);
          setTotalRevenue(data.revenue ?? 0);
        } else {
          console.error(
            "Failed to fetch dashboard statistics:",
            data.message
          );
        }
      } catch (error) {
        console.error(
          "Failed to fetch dashboard statistics:",
          error
        );
      }
    };

    fetchProducts();
    fetchStats();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    navigate("/admin");
  };

  const formatRevenue = (amount) =>
    `PKR ${Number(amount).toLocaleString("en-PK")}`;

  return (
    <div className="admin-dashboard">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          𝚁𝙾𝚂𝙷𝙴<span>.</span>
        </div>

        <p className="sidebar-label">ADMIN PANEL</p>

        <nav className="admin-nav">
          <button
            className="active"
            onClick={() => navigate("/admin/dashboard")}
          >
            <span>▦</span>
            Dashboard
          </button>

          <button onClick={() => navigate("/admin/products")}>
            <span>◫</span>
            Products
          </button>

          <button onClick={() => navigate("/admin/orders")}>
            <span>▤</span>
            Orders
          </button>

          <button onClick={() => navigate("/admin/customers")}>
            <span>♡</span>
            Customers
          </button>

          <button onClick={() => navigate("/admin/shipping")}>
            <span>↗</span>
            Shipping Settings
          </button>

          {/* COUPONS & OFFERS */}
          <button onClick={() => navigate("/admin/coupons")}>
            <span>％</span>
            Coupons & Offers
          </button>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <span>↪</span>
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="admin-main">
        {/* TOP BAR */}
        <header className="admin-topbar">
          <div>
            <p className="admin-small-title">OVERVIEW</p>
            <h1>Dashboard</h1>
          </div>

          <div className="admin-profile">
            <div className="admin-avatar">
              {admin?.name?.charAt(0).toUpperCase() || "A"}
            </div>

            <div>
              <strong>{admin?.name || "Admin"}</strong>
              <span>{admin?.email || ""}</span>
            </div>
          </div>
        </header>

        {/* STATS */}
        <section className="admin-stats">
          <div className="stat-card">
            <div className="stat-icon">◫</div>
            <div>
              <p>Total Products</p>
              <h2>{totalProducts}</h2>
            </div>
          </div>

          <div
            className="stat-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/admin/orders")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/admin/orders");
              }
            }}
          >
            <div className="stat-icon">▤</div>
            <div>
              <p>Total Orders</p>
              <h2>{totalOrders ?? "—"}</h2>
            </div>
          </div>

          <div
            className="stat-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/admin/customers")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate("/admin/customers");
              }
            }}
          >
            <div className="stat-icon">♡</div>
            <div>
              <p>Customers</p>
              <h2>{totalCustomers ?? "—"}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">₨</div>
            <div>
              <p>Total Revenue</p>
              <h2>
                {totalRevenue === null
                  ? "PKR —"
                  : formatRevenue(totalRevenue)}
              </h2>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="quick-section">
          <div className="admin-section-heading">
            <div>
              <p className="admin-small-title">MANAGE STORE</p>
              <h2>Quick Actions</h2>
            </div>
          </div>

          <div className="quick-grid">
            <button
              className="quick-card"
              onClick={() => navigate("/admin/add-product")}
            >
              <div className="quick-icon">＋</div>
              <div>
                <h3>Add Product</h3>
                <p>Add a new dress or accessory</p>
              </div>
              <span>→</span>
            </button>

            <button
              className="quick-card"
              onClick={() => navigate("/admin/products")}
            >
              <div className="quick-icon">◫</div>
              <div>
                <h3>Manage Products</h3>
                <p>Edit or remove existing products</p>
              </div>
              <span>→</span>
            </button>

            <button
              className="quick-card"
              onClick={() => navigate("/admin/orders")}
            >
              <div className="quick-icon">▤</div>
              <div>
                <h3>View Orders</h3>
                <p>Check and manage customer orders</p>
              </div>
              <span>→</span>
            </button>

            {/* COUPONS & OFFERS */}
            <button
              className="quick-card"
              onClick={() => navigate("/admin/coupons")}
            >
              <div className="quick-icon">％</div>
              <div>
                <h3>Coupons & Offers</h3>
                <p>Create discount codes and manage sale offers</p>
              </div>
              <span>→</span>
            </button>
          </div>
        </section>

        {/* WELCOME CARD */}
        <section className="admin-welcome">
          <div>
            <p className="admin-small-title">ROSHE STORE</p>

            <h2>
              Your store,
              <br />
              <span>your control.</span>
            </h2>

            <p>
              Manage your products, orders and customers
              from one simple dashboard.
            </p>
          </div>

          <div className="welcome-mark">
            𝚁𝙾𝚂𝙷𝙴<span>.</span>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
