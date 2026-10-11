
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./AddProduct.css";

const API_URL = "http://localhost:5000/api/products";

function AddProduct() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const productId = searchParams.get("id");
  const isEditMode = Boolean(productId);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    discountPercent: "0",
    category: "Women",
    image: "",
    sizes: "",
    colors: "",
    stock: "",
    isNew: false,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(isEditMode);

  // Fetch the existing product when Edit mode opens
  useEffect(() => {
    if (!isEditMode) return;

    const fetchProduct = async () => {
      const token = localStorage.getItem("adminToken");

      if (!token) {
        navigate("/admin");
        return;
      }

      setFetchingProduct(true);

      try {
        // Use the existing products endpoint and find this product by ID.
        const response = await fetch(API_URL);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load products.");
        }

        const products = Array.isArray(data)
          ? data
          : data.products || [];

        const product = products.find(
          (item) => String(item._id) === String(productId)
        );

        if (!product) {
          alert("Product not found. Please check the product list.");
          navigate("/admin/products");
          return;
        }

        const existingImage =
          product.images?.[0] || product.image || "";

        setFormData({
          name: product.name || "",
          description: product.description || "",
          price: product.price ?? "",
          discountPercent: product.discountPercent ?? 0,
          category: product.category || "Women",
          image: existingImage,
          sizes: Array.isArray(product.sizes)
            ? product.sizes.join(", ")
            : product.sizes || "",
          colors: Array.isArray(product.colors)
            ? product.colors.join(", ")
            : product.colors || "",
          stock: product.stock ?? "",
          isNew: Boolean(product.isNew),
        });

        setImagePreview(existingImage);
      } catch (error) {
        console.error("Fetch product error:", error);
        alert(error.message || "Failed to load product details.");
      } finally {
        setFetchingProduct(false);
      }
    };

    fetchProduct();
  }, [isEditMode, productId, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPG, PNG or WEBP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB.");
      e.target.value = "";
      return;
    }

    if (imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImageToCloudinary = async () => {
    if (!imageFile) return null;

    setUploadingImage(true);

    try {
      const cloudinaryFormData = new FormData();

      cloudinaryFormData.append("file", imageFile);
      cloudinaryFormData.append(
        "upload_preset",
        "roshe_products"
      );

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/bfuh8x3r/image/upload",
        {
          method: "POST",
          body: cloudinaryFormData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Cloudinary error:", data);
        throw new Error(
          data.error?.message || "Image upload failed."
        );
      }

      return data.secure_url;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("adminToken");

    if (!token) {
      navigate("/admin");
      return;
    }

    // A new product needs an image. Editing can keep its existing image.
    if (!isEditMode && !imageFile) {
      alert("Please upload a product image.");
      return;
    }

    if (isEditMode && !formData.image && !imageFile) {
      alert("Please select a product image.");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = formData.image;

      // Upload only if a new image has been selected.
      if (imageFile) {
        imageUrl = await uploadImageToCloudinary();

        if (!imageUrl) {
          alert("Image upload failed. Please try again.");
          return;
        }
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        discountPercent: Number(formData.discountPercent || 0),
        category: formData.category,
        images: imageUrl ? [imageUrl] : [],
        sizes: formData.sizes
          .split(",")
          .map((size) => size.trim())
          .filter(Boolean),
        colors: formData.colors
          .split(",")
          .map((color) => color.trim())
          .filter(Boolean),
        stock: Number(formData.stock),
        isNew: formData.isNew,
      };

      const response = await fetch(
        isEditMode ? `${API_URL}/${productId}` : API_URL,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(productData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            (isEditMode
              ? "Failed to update product."
              : "Failed to add product.")
        );
        return;
      }

      alert(
        isEditMode
          ? "Product updated successfully!"
          : "Product added successfully!"
      );

      navigate("/admin/products");
    } catch (error) {
      console.error("Save product error:", error);
      alert(
        error.message || "Server connection failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProduct) {
    return (
      <div className="add-product-page">
        <main className="add-product-main">
          <h2>Loading product details...</h2>
        </main>
      </div>
    );
  }

  return (
    <div className="add-product-page">
      <aside className="add-product-sidebar">
        <div className="add-product-sidebar-logo">
          𝚁𝙾𝚂𝙷𝙴<span>.</span>
        </div>

        <p className="add-product-sidebar-label">
          ADMIN PANEL
        </p>

        <nav className="add-product-nav">
          <button
            onClick={() => navigate("/admin/dashboard")}
          >
            <span>▦</span>
            Dashboard
          </button>

          <button
            className="active"
            onClick={() => navigate("/admin/products")}
          >
            <span>◫</span>
            Products
          </button>

          <button>
            <span>▤</span>
            Orders
          </button>

          <button>
            <span>♡</span>
            Customers
          </button>
        </nav>

        <button
          className="add-product-logout"
          onClick={() => {
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");
            navigate("/admin");
          }}
        >
          <span>↪</span>
          Logout
        </button>
      </aside>

      <main className="add-product-main">
        <header className="add-product-topbar">
          <div>
            <p className="add-product-small-title">
              STORE MANAGEMENT
            </p>
            <h1>{isEditMode ? "Edit Product" : "Add Product"}</h1>
          </div>

          <button
            className="back-products-btn"
            onClick={() => navigate("/admin/products")}
          >
            ← Back to Products
          </button>
        </header>

        <section className="add-product-card">
          <div className="add-product-heading">
            <p className="add-product-small-title">
              PRODUCT DETAILS
            </p>

            <h2>
              {isEditMode
                ? "Update product details"
                : "Create a new product"}
            </h2>

            <p>
              {isEditMode
                ? "Edit the details of your ROSHE product below."
                : "Add the details of your ROSHE dress or accessory."}
            </p>
          </div>

          <form
            className="add-product-form"
            onSubmit={handleSubmit}
          >
            <div className="form-section">
              <div className="form-section-title">
                <span>01</span>
                <div>
                  <h3>Basic Information</h3>
                  <p>Product name and description</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Product Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Embroidered Lawn Suit"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-field full-width">
                  <label>Description</label>
                  <textarea
                    name="description"
                    placeholder="Describe the product..."
                    value={formData.description}
                    onChange={handleChange}
                    rows="5"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">
                <span>02</span>
                <div>
                  <h3>Pricing & Category</h3>
                  <p>Set the product price and collection</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>Price</label>
                  <div className="input-with-prefix">
                    <span>PKR</span>
                    <input
                      type="number"
                      name="price"
                      placeholder="3499"
                      min="0"
                      value={formData.price}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="Women">Women</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                                  <div className="form-field">
                  <label>Product Discount (%)</label>
                  <div className="input-with-prefix">
                    <span>%</span>
                    <input
                      type="number"
                      name="discountPercent"
                      placeholder="0"
                      min="0"
                      max="90"
                      step="1"
                      value={formData.discountPercent}
                      onChange={handleChange}
                    />
                  </div>
                  <small>
                    Enter 0 for no discount, or a percentage up to 90%.
                  </small>
                </div>

              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">
                <span>03</span>
                <div>
                  <h3>Product Image</h3>
                  <p>
                    {isEditMode
                      ? "Keep the current image or upload a replacement"
                      : "Upload the main product image"}
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Product Image</label>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    required={!isEditMode && !formData.image}
                  />

                  <small>
                    JPG, PNG or WEBP. Maximum size 5MB.
                    {isEditMode &&
                      " Leave this empty to keep the current image."}
                  </small>

                  {imagePreview && (
                    <div className="image-preview">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">
                <span>04</span>
                <div>
                  <h3>Product Options</h3>
                  <p>Sizes, colors and available stock</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>Sizes</label>
                  <input
                    type="text"
                    name="sizes"
                    placeholder="S, M, L, XL"
                    value={formData.sizes}
                    onChange={handleChange}
                  />
                  <small>Separate sizes with commas.</small>
                </div>

                <div className="form-field">
                  <label>Colors</label>
                  <input
                    type="text"
                    name="colors"
                    placeholder="Black, White, Green"
                    value={formData.colors}
                    onChange={handleChange}
                  />
                  <small>Separate colors with commas.</small>
                </div>

                <div className="form-field">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    name="stock"
                    placeholder="20"
                    min="0"
                    value={formData.stock}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="new-arrival-option">
                <div>
                  <h3>Mark as New Arrival</h3>
                  <p>
                    Show this product in the New Arrivals collection.
                  </p>
                </div>

                <label className="switch">
                  <input
                    type="checkbox"
                    name="isNew"
                    checked={formData.isNew}
                    onChange={handleChange}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-product-btn"
                onClick={() => navigate("/admin/products")}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-product-btn"
                disabled={loading || uploadingImage}
              >
                {uploadingImage
                  ? "Uploading Image..."
                  : loading
                  ? "Saving..."
                  : isEditMode
                  ? "Update Product →"
                  : "Save Product →"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default AddProduct;
