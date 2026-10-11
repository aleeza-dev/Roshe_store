
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ShippingSettings() {
  const navigate = useNavigate();

  const [freeShipping, setFreeShipping] = useState(true);
  const [shippingFee, setShippingFee] = useState("250");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin");
      return;
    }

    const loadSettings = async () => {
      try {
        const response = await fetch(
          "https://roshe-backend.onrender.com/api/settings/shipping"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load settings");
        }

        setFreeShipping(data.freeShipping);
        setShippingFee(String(data.shippingFee ?? 250));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [navigate]);

  const handleSave = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const token = localStorage.getItem("adminToken");
    const fee = Number(shippingFee);

    if (!freeShipping && (!Number.isFinite(fee) || fee < 0)) {
      setError("Please enter a valid shipping fee.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "https://roshe-backend.onrender.com/api/settings/shipping",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            freeShipping,
            shippingFee: freeShipping ? 0 : fee,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save settings");
      }

      setFreeShipping(data.freeShipping);
      setShippingFee(String(data.shippingFee));
      setMessage("Shipping settings saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 30 }}>Loading shipping settings...</div>;
  }

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "40px auto",
        padding: 24,
        fontFamily: "Arial, sans-serif",
        color: "#26352e",
      }}
    >
      <button
        type="button"
        onClick={() => navigate("/admin/dashboard")}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          marginBottom: 20,
          color: "#496b58",
        }}
      >
        ← Back to Dashboard
      </button>

      <h1 style={{ marginBottom: 8 }}>Shipping Settings</h1>
      <p style={{ color: "#6c7a71", marginBottom: 28 }}>
        Choose how shipping charges are calculated for ROSHE orders.
      </p>

      <form
        onSubmit={handleSave}
        style={{
          border: "1px solid #dce5dd",
          borderRadius: 14,
          padding: 24,
          background: "#fff",
        }}
      >
        <label
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: 16,
            border: "1px solid #dce5dd",
            borderRadius: 10,
            marginBottom: 14,
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="shipping"
            checked={freeShipping}
            onChange={() => setFreeShipping(true)}
          />
          <span>
            <strong>Free Shipping</strong>
            <br />
            <span style={{ color: "#718078", fontSize: 14 }}>
              Customers pay PKR 0 for delivery.
            </span>
          </span>
        </label>

        <label
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: 16,
            border: "1px solid #dce5dd",
            borderRadius: 10,
            marginBottom: 20,
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="shipping"
            checked={!freeShipping}
            onChange={() => setFreeShipping(false)}
          />
          <span>
            <strong>Paid Shipping</strong>
            <br />
            <span style={{ color: "#718078", fontSize: 14 }}>
              Set a delivery fee for customer orders.
            </span>
          </span>
        </label>

        {!freeShipping && (
          <div style={{ marginBottom: 22 }}>
            <label
              htmlFor="shippingFee"
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Shipping Fee (PKR)
            </label>

            <input
              id="shippingFee"
              type="number"
              min="0"
              step="1"
              required
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
              placeholder="Enter delivery fee"
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #ccd8ce",
                borderRadius: 8,
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {message && (
          <p style={{ color: "green", marginBottom: 16 }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ color: "crimson", marginBottom: 16 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "12px 22px",
            border: "none",
            borderRadius: 8,
            background: "#496b58",
            color: "#fff",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Shipping Settings"}
        </button>
      </form>
    </div>
  );
}

export default ShippingSettings;
