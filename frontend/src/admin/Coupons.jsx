import React, { useCallback, useEffect, useState } from "react";
import "./Coupons.css";

const API_URL = "http://localhost:5000/api/coupons";

const emptyForm = {
  code: "",
  percentOff: 10,
  minOrderAmount: 0,
  expiresAt: "",
  description: "",
  active: true,
};

const getToken = () =>
  localStorage.getItem("adminToken") ||
  localStorage.getItem("token") ||
  "";

const formatPKR = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-PK")}`;

const getExpiryInput = (date) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  const localDate = new Date(
    parsed.getTime() - parsed.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
};

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const apiRequest = async (path = "", options = {}) => {
    const token = getToken();

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
          (response.status === 401 || response.status === 403
            ? "Admin authorization failed. Please sign in again."
            : "Something went wrong.")
      );
    }

    return data;
  };

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest();
      setCoupons(Array.isArray(data) ? data : data.coupons || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const openEditForm = (coupon) => {
    setEditingId(coupon._id);
    setForm({
      code: coupon.code || "",
      percentOff: coupon.percentOff ?? 10,
      minOrderAmount: coupon.minOrderAmount ?? 0,
      expiresAt: getExpiryInput(coupon.expiresAt),
      description: coupon.description || "",
      active: coupon.active === true,
    });
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.expiresAt) {
      setError("Please select a coupon expiry date and time.");
      return;
    }

    if (new Date(form.expiresAt).getTime() <= Date.now()) {
      setError("Expiry date must be in the future.");
      return;
    }

    setSaving(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      percentOff: Number(form.percentOff),
      minOrderAmount: Number(form.minOrderAmount),
      expiresAt: new Date(form.expiresAt).toISOString(),
      description: form.description.trim(),
      active: form.active,
    };

    try {
      const result = await apiRequest(
        editingId ? `/${editingId}` : "",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setNotice(
        result.message ||
          (editingId
            ? "Coupon updated successfully."
            : "Coupon created successfully.")
      );
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadCoupons();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (coupon) => {
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(`/${coupon._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: !coupon.active }),
      });

      setNotice(result.message || "Coupon status updated.");
      await loadCoupons();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (coupon) => {
    const confirmed = window.confirm(
      `Delete coupon "${coupon.code}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const result = await apiRequest(`/${coupon._id}`, {
        method: "DELETE",
      });

      setNotice(result.message || "Coupon deleted successfully.");
      await loadCoupons();
    } catch (err) {
      setError(err.message);
    }
  };

  const isExpired = (coupon) =>
    !coupon.expiresAt || new Date(coupon.expiresAt).getTime() <= Date.now();

  const filteredCoupons = coupons.filter((coupon) =>
    `${coupon.code} ${coupon.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const activeCount = coupons.filter(
    (coupon) => coupon.active && !isExpired(coupon)
  ).length;

  const expiredCount = coupons.filter(isExpired).length;

  return (
    <main className="roshe-coupons">
      <header className="coupons-topbar">
        <div>
          <p className="coupons-eyebrow">ROSHE STORE / ADMIN</p>
          <h1>Coupon Management</h1>
          <p className="coupons-subtitle">
            Create and manage promotional offers for your customers.
          </p>
        </div>

        <button className="coupons-primary-btn" onClick={openAddForm}>
          <span>＋</span> Create Coupon
        </button>
      </header>

      {error && (
        <div className="coupons-alert coupons-alert-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      {notice && (
        <div className="coupons-alert coupons-alert-success" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <section className="coupons-stats">
        <article className="coupons-stat-card">
          <span className="coupons-stat-icon">%</span>
          <div>
            <p>Total Coupons</p>
            <strong>{coupons.length}</strong>
          </div>
        </article>

        <article className="coupons-stat-card">
          <span className="coupons-stat-icon coupons-stat-green">✓</span>
          <div>
            <p>Active Offers</p>
            <strong>{activeCount}</strong>
          </div>
        </article>

        <article className="coupons-stat-card">
          <span className="coupons-stat-icon coupons-stat-pink">⌛</span>
          <div>
            <p>Expired Coupons</p>
            <strong>{expiredCount}</strong>
          </div>
        </article>
      </section>

      {showForm && (
        <section className="coupons-form-card">
          <div className="coupons-form-heading">
            <div>
              <p className="coupons-eyebrow">
                {editingId ? "UPDATE OFFER" : "NEW PROMOTION"}
              </p>
              <h2>{editingId ? "Edit Coupon" : "Create a Coupon"}</h2>
            </div>

            <button
              type="button"
              className="coupons-close-btn"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div className="coupons-form-grid">
              <label>
                Coupon Code *
                <input
                  name="code"
                  value={form.code}
                  onChange={handleFormChange}
                  placeholder="e.g. ROSHE20"
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9_-]{3,30}"
                  title="Use 3–30 letters, numbers, underscores or hyphens."
                  required
                />
                <small>Letters, numbers, _ and - only.</small>
              </label>

              <label>
                Discount Percentage *
                <div className="coupons-input-suffix">
                  <input
                    name="percentOff"
                    type="number"
                    min="1"
                    max="90"
                    value={form.percentOff}
                    onChange={handleFormChange}
                    required
                  />
                  <span>% OFF</span>
                </div>
              </label>

              <label>
                Minimum Order Amount (PKR)
                <input
                  name="minOrderAmount"
                  type="number"
                  min="0"
                  step="1"
                  value={form.minOrderAmount}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label>
                Expiry Date & Time *
                <input
                  name="expiresAt"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={handleFormChange}
                  min={getExpiryInput(Date.now())}
                  required
                />
              </label>

              <label className="coupons-description-field">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="e.g. Special offer for new customers"
                  maxLength={160}
                  rows={3}
                />
                <small>{form.description.length}/160 characters</small>
              </label>

              <label className="coupons-active-option">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={handleFormChange}
                />
                <span>
                  <strong>Coupon active</strong>
                  <small>
                    Active coupons can be used before their expiry date.
                  </small>
                </span>
              </label>
            </div>

            <div className="coupons-form-actions">
              <button
                type="button"
                className="coupons-secondary-btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="coupons-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Save Changes"
                  : "Create Coupon"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="coupons-table-card">
        <div className="coupons-table-heading">
          <div>
            <h2>All Coupons</h2>
            <p>Review and manage your store's promotional codes.</p>
          </div>

          <input
            className="coupons-search"
            type="search"
            placeholder="Search coupons..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="coupons-state">
            <span className="coupons-spinner" />
            <p>Loading coupons...</p>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="coupons-state">
            <div className="coupons-empty-icon">%</div>
            <h3>{search ? "No matching coupons" : "No coupons yet"}</h3>
            <p>
              {search
                ? "Try searching with a different code."
                : "Create your first discount code to start offering promotions."}
            </p>
            {!search && (
              <button className="coupons-primary-btn" onClick={openAddForm}>
                Create First Coupon
              </button>
            )}
          </div>
        ) : (
          <div className="coupons-table-scroll">
            <table className="coupons-table">
              <thead>
                <tr>
                  <th>Coupon</th>
                  <th>Discount</th>
                  <th>Minimum Order</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCoupons.map((coupon) => {
                  const expired = isExpired(coupon);

                  return (
                    <tr key={coupon._id}>
                      <td>
                        <div className="coupons-code">{coupon.code}</div>
                        <div className="coupons-description">
                          {coupon.description || "No description"}
                        </div>
                      </td>

                      <td>
                        <span className="coupons-discount">
                          {coupon.percentOff}% OFF
                        </span>
                      </td>

                      <td>{formatPKR(coupon.minOrderAmount)}</td>

                      <td>
                        <div className="coupons-expiry">
                          {coupon.expiresAt
                            ? new Date(coupon.expiresAt).toLocaleString()
                            : "Not set"}
                        </div>
                        {expired && (
                          <span className="coupons-expired-label">
                            Expired
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          className={`coupons-status ${
                            expired
                              ? "status-expired"
                              : coupon.active
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          {expired
                            ? "Expired"
                            : coupon.active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <div className="coupons-actions">
                          <button
                            className="coupons-action-edit"
                            onClick={() => openEditForm(coupon)}
                            title="Edit coupon"
                          >
                            Edit
                          </button>

                          <button
                            className="coupons-action-toggle"
                            onClick={() => handleStatus(coupon)}
                            disabled={expired}
                            title={
                              expired
                                ? "Expired coupons cannot be activated for use"
                                : coupon.active
                                ? "Deactivate coupon"
                                : "Activate coupon"
                            }
                          >
                            {coupon.active ? "Disable" : "Enable"}
                          </button>

                          <button
                            className="coupons-action-delete"
                            onClick={() => handleDelete(coupon)}
                            title="Delete coupon"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="coupons-footer">
        <span>ROSHE. · Coupon Administration</span>
        <span>{coupons.length} coupon(s) in your store</span>
      </footer>
    </main>
  );
};

export default Coupons;
