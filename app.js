import fs from "node:fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import express from "express";

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static("public")); // Serve static files from the "public" directory

// CORS Headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Get the current directory path
const __dirname = dirname(fileURLToPath(import.meta.url));

// File paths
const mealsFilePath = join(__dirname, "data", "available-meals.json");
const ordersFilePath = join(__dirname, "data", "orders.json");

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Food App API!",
    endpoints: {
      meals: "/meals",
      orders: "/orders",
      debugImages: "/debug/images",
      images: "/images/:filename",
    },
  });
});

// Debug route to check if the image exists
app.get("/debug/images", async (req, res) => {
  const imagePath = join(__dirname, "public", "images", "mac-and-cheese.jpg");
  try {
    const exists = await fs
      .access(imagePath)
      .then(() => true)
      .catch(() => false);
    res.json({
      exists,
      path: imagePath,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error checking image file", error: err.message });
  }
});

// Serve static images
app.use("/images", express.static(path.join(__dirname, "public", "images")));

// Meals endpoint
app.get("/meals", async (req, res) => {
  try {
    const meals = await fs.readFile(mealsFilePath, "utf8");
    res.json(JSON.parse(meals));
  } catch (err) {
    console.error("Error reading meals file:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Orders endpoint
app.post("/orders", async (req, res) => {
  const orderData = req.body.order;

  if (
    orderData === null ||
    orderData.items === null ||
    orderData.items.length === 0
  ) {
    return res.status(400).json({ message: "Missing data." });
  }

  if (
    orderData.customer.email === null ||
    !orderData.customer.email.includes("@") ||
    orderData.customer.name === null ||
    orderData.customer.name.trim() === "" ||
    orderData.customer.street === null ||
    orderData.customer.street.trim() === "" ||
    orderData.customer["postal-code"] === null ||
    orderData.customer["postal-code"].trim() === "" ||
    orderData.customer.city === null ||
    orderData.customer.city.trim() === ""
  ) {
    return res.status(400).json({
      message:
        "Missing data: Email, name, street, postal code or city is missing.",
    });
  }

  const newOrder = {
    ...orderData,
    id: (Math.random() * 1000).toString(),
  };

  try {
    const orders = await fs.readFile(ordersFilePath, "utf8");
    const allOrders = JSON.parse(orders);
    allOrders.push(newOrder);
    await fs.writeFile(ordersFilePath, JSON.stringify(allOrders));
    res.status(201).json({ message: "Order created!" });
  } catch (err) {
    console.error("Error processing order:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Debug orders endpoint
app.get("/debug/orders", async (req, res) => {
  try {
    const orders = await fs.readFile(ordersFilePath, "utf8");
    res.json({ orders: JSON.parse(orders) });
  } catch (err) {
    console.error("Error reading orders file:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Fallback for OPTIONS requests
app.use((req, res) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  res.status(404).json({ message: "Not found" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
