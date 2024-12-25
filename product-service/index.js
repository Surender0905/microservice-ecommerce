const express = require("express");
const mongoose = require("mongoose");
const amqplib = require("amqplib");
const Product = require("./models/product.model");
const isAuthenticated = require("../isAuthenticated");

const app = express();

// Middleware
app.use(express.json());
let order;
let channel, connection;

//connect to RabbitMQ
async function connectToRabbitMQ() {
    try {
        const amqpServer = "amqp://localhost:5672";
        connection = await amqplib.connect(amqpServer);
        channel = await connection.createChannel();
        await channel.assertQueue("PRODUCTS");
        console.log("Connected to RabbitMQ");
    } catch (error) {
        console.error("Error connecting to RabbitMQ:", error);
        process.exit(1);
    }
}

connectToRabbitMQ();

// Routes
app.get("/products", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/products", isAuthenticated, async (req, res) => {
    try {
        const { name, description, price } = req.body;
        const product = new Product({ name, description, price });
        await product.save();

        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

//user sends a list of product ids to buy
//creating order for the products
app.post("/products/buy", isAuthenticated, async (req, res) => {
    try {
        const { productIds } = req.body;
        const products = await Product.find({ _id: { $in: productIds } });
        channel.sendToQueue(
            "ORDERS",
            Buffer.from(
                JSON.stringify({
                    products,
                    userId: req.user.id,
                    userEmail: req.user.email,
                }),
            ),
        );

        //consumer will process the order response
        channel.consume("PRODUCTS", (msg) => {
            console.log("Received order response:", msg.content.toString());
            order = JSON.parse(msg.content);
            channel.ack(msg);
        });

        console.log(order, "order");

        res.status(201).json({ message: "Order placed successfully", order });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Connect to MongoDB
mongoose
    .connect("mongodb://localhost:27017/product-service")
    .then(() => {
        console.log("Product Service Connected to MongoDB");
    })
    .catch((err) => {
        console.log(err);
    });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Product Server is running on port ${PORT}`);
});
