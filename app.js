import fs from "node:fs/promises";

import { join, dirname } from "path";
import { fileURLToPath } from "url";

import path from "path";

import bodyParser from "body-parser";
import express from "express";
import { log } from "node:console";

import cors from "cors";

const app = express();

const __dirname = dirname(fileURLToPath(import.meta.url));
const mealsFilePath = join(__dirname, "data", "available-meals.json");
const ordersFilePath = join(__dirname, "data", "orders.json");

// Enable CORS for all routes
app.use(
  cors({
    origin: "https://food-app-phi-snowy.vercel.app", // Allow requests from your frontend
    methods: ["GET", "POST"], // Allow only GET and POST requests
    allowedHeaders: ["Content-Type"], // Allow only specific headers
  })
);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Food App API!",
    endpoints: {
      meals: "/meals",
      orders: "/orders",
      debugOrders: "/debug/orders",
    },
  });
});

app.get("/meals", async (req, res) => {
  try {
    const meals = await fs.readFile(mealsFilePath, "utf8");
    res.json(JSON.parse(meals));
  } catch (err) {
    console.error("Error reading meals file:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/orders", async (req, res) => {
  try {
    const orderData = req.body.order;

    // Validate order data
    if (!orderData || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({ message: "Missing data." });
    }

    // Validate customer data
    if (
      !orderData.customer ||
      !orderData.customer.email ||
      !orderData.customer.email.includes("@") ||
      !orderData.customer.name ||
      orderData.customer.name.trim() === "" ||
      !orderData.customer.street ||
      orderData.customer.street.trim() === "" ||
      !orderData.customer["postal-code"] ||
      orderData.customer["postal-code"].trim() === "" ||
      !orderData.customer.city ||
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

    // Read existing orders
    let allOrders = [];
    try {
      const ordersData = await fs.readFile(ordersFilePath, "utf8");
      allOrders = JSON.parse(ordersData);
    } catch (err) {
      if (err.code !== "ENOENT") {
        throw err; // Re-throw if the error is not "file not found"
      }
    }

    // Add the new order
    allOrders.push(newOrder);

    // Write updated orders to file
    await fs.writeFile(ordersFilePath, JSON.stringify(allOrders, null, 2));

    res.status(201).json({ message: "Order created!" });
  } catch (err) {
    console.error("Error processing order:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

app.get("/debug/orders", async (req, res) => {
  try {
    const ordersFilePath = join(__dirname, "data", "orders.json");
    const orders = await fs.readFile(ordersFilePath, "utf8");
    res.json({ orders: JSON.parse(orders) });
  } catch (err) {
    console.error("Error reading orders file:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

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
