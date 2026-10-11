
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Products.css";

const API = "https://roshe-backend.onrender.com/api";

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const statuses = [
    "Pending",
    "Confirmed",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const user = localStorage.getItem("adminUser");

    if (!token || !user) {
      navigate("/admin");
      return;
    }

    loadOrders();
  }, [navigate]);

  const loadOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/orders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load orders.");
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load orders.");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    setError("");

    try {
      const response = await fetch(
        `${API}/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update status.");
      }

      setOrders((current) =>
        current.map((order) =>
          order._id === orderId ? data.order : order
        )
      );
    } catch (err) {
      setError(err.message || "Could not update order status.");
    } finally {
      setUpdatingId("");
    }
  };

  const deleteOrder = async (order) => {
    const confirmed = window.confirm(
      `Delete order ${order.orderNumber} for ${order.customer?.name || "this customer"}?\n\nThis permanently deletes this order and its saved delivery details. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(order._id);
    setError("");

    try {
      const response = await fetch(`${API}/orders/${order._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete order.");
      }

      setOrders((current) =>
        current.filter((item) => item._id !== order._id)
      );
    } catch (err) {
      setError(err.message || "Could not delete order.");
    } finally {
      setDeletingId("");
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
        <div className="products-sidebar-logo">
          𝚁𝙾𝚂𝙷𝙴<span>.</span>
        </div>

        <p className="products-sidebar-label">ADMIN PANEL</p>

        <nav className="products-nav">
          <button onClick={() => navigate("/admin/dashboard")}>
            ▦ Dashboard
          </button>
          <button onClick={() => navigate("/admin/products")}>
            ◫ Products
          </button>
          <button className="active">▤ Orders</button>
          <button onClick={() => navigate("/admin/customers")}>
            ♡ Customers
          </button>
          <button onClick={() => navigate("/admin/shipping")}>
            ↗ Shipping Settings
          </button>
        </nav>

        <button className="products-logout" onClick={logout}>
          ↪ Logout
        </button>
      </aside>

      <main className="products-main">
        <header className="products-topbar">
          <div>
            <p className="products-small-title">STORE MANAGEMENT</p>
            <h1>Orders</h1>
          </div>

          <button
            className="add-product-btn"
            onClick={loadOrders}
            disabled={loading || Boolean(deletingId)}
          >
            ↻ Refresh
          </button>
        </header>

        {error && (
          <p role="alert" style={messageStyle}>
            {error}
          </p>
        )}

        <section className="products-section">
          <div className="products-section-header">
            <div>
              <p className="products-small-title">CUSTOMER PURCHASES</p>
              <h2>All Orders</h2>
            </div>

            <span className="product-count">
              {orders.length} Orders
            </span>
          </div>

          {loading ? (
            <div className="products-empty">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="products-empty">
              <div className="empty-icon">▤</div>
              <h3>No orders yet</h3>
              <p>
                Customer orders will appear here after checkout is live.
              </p>
            </div>
          ) : (
            <div className="products-table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <strong>{order.orderNumber}</strong>
                        <p>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </td>

                      <td>
                        <strong>{order.customer?.name}</strong>
                        <p>{order.customer?.email}</p>
                        <p>{order.customer?.phone}</p>
                        <p>
                          {order.customer?.address}, {order.customer?.city}
                        </p>
                      </td>

                      <td>
                        {(order.items || []).map((item, index) => (
                          <p key={`${order._id}-${index}`}>
                            {item.name} × {item.quantity}
                            {item.selectedSize
                              ? ` • ${item.selectedSize}`
                              : ""}
                            {item.selectedColor
                              ? ` • ${item.selectedColor}`
                              : ""}
                          </p>
                        ))}
                      </td>

                      <td>
                        <strong>
                          PKR {Number(order.total || 0).toLocaleString()}
                        </strong>
                      </td>

                      <td>
                        {order.paymentMethod}
                        <p>{order.paymentStatus}</p>
                      </td>

                      <td>
                        <select
                          value={order.status}
                          disabled={
                            updatingId === order._id ||
                            deletingId === order._id
                          }
                          onChange={(event) =>
                            updateStatus(order._id, event.target.value)
                          }
                          aria-label={`Status for ${order.orderNumber}`}
                          style={selectStyle}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        {updatingId === order._id && <p>Saving...</p>}
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => deleteOrder(order)}
                          disabled={
                            deletingId === order._id ||
                            updatingId === order._id
                          }
                          style={deleteButtonStyle}
                        >
                          {deletingId === order._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
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
  padding: "12px 16px",
  color: "#9b2828",
  background: "#fcebea",
  borderRadius: "6px",
};

const selectStyle = {
  minWidth: "130px",
  padding: "9px",
  border: "1px solid #d8dfd8",
  borderRadius: "6px",
  background: "#fff",
};

const deleteButtonStyle = {
  padding: "9px 14px",
  border: "1px solid #b91c1c",
  borderRadius: "6px",
  background: "#fff",
  color: "#b91c1c",
  cursor: "pointer",
  fontWeight: 600,
};

export default Orders;
