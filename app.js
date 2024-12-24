import fs from "node:fs/promises";

import { join, dirname } from "path";
import { fileURLToPath } from "url";

import bodyParser from "body-parser";
import express from "express";

const app = express();

app.use(bodyParser.json());
app.use(express.static("public"));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const mealsFilePath = join(__dirname, "data", "available-meals.json");
const ordersFilePath = join(__dirname, "data", "orders.json");

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

//   const orders = await fs.readFile("./data/orders.json", "utf8");
//   const allOrders = JSON.parse(orders);

  const orders = await fs.readFile(ordersFilePath, "utf8");
  const allOrders = JSON.parse(orders);

  allOrders.push(newOrder);
  //await fs.writeFile("./data/orders.json", JSON.stringify(allOrders));
  await fs.writeFile(ordersFilePath, JSON.stringify(allOrders));
  res.status(201).json({ message: "Order created!" });
});

app.use((req, res) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  res.status(404).json({ message: "Not found" });
});

app.listen(3000);
