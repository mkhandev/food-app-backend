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
  const orderData = req.body.order;

  if (!orderData) {
    return res.status(400).json({ message: "Missing order data." });
  }

  if (!orderData.items || orderData.items.length === 0) {
    return res
      .status(400)
      .json({ message: "Missing or empty items in order." });
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

  const orders = await fs.readFile(ordersFilePath, "utf8");
  const allOrders = JSON.parse(orders);

  allOrders.push(newOrder);
  return res.status(400).json({ message: newOrder });
  await fs.writeFile(ordersFilePath, JSON.stringify(allOrders));

  res.status(201).json({ message: "Order created!" });
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
