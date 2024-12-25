const express = require("express");
const mongoose = require("mongoose");
const amqplib = require("amqplib");
const Order = require("./models/order.model");
const isAuthenticated = require("../isAuthenticated");

const app = express();

// Middleware
app.use(express.json());

let channel, connection;

//connect to RabbitMQ
async function connectToRabbitMQ() {
    try {
        const amqpServer = "amqp://localhost:5672";
        connection = await amqplib.connect(amqpServer);
        channel = await connection.createChannel();
        await channel.assertQueue("ORDERS");
        console.log("Connected to RabbitMQ");
    } catch (error) {
        console.error("Error connecting to RabbitMQ:", error);
        process.exit(1);
    }
}
// RabbitMQ consumer
connectToRabbitMQ()
    .then(() => {
        channel.consume("ORDERS", (msg) => {
            try {
                const orderData = JSON.parse(msg.content.toString());
                console.log("Received order:", orderData);
                const newOrder = createOrder(
                    orderData.products,
                    orderData.userEmail,
                );
                // console.log("Created order:", newOrder);
                channel.ack(msg);
                //now send order response back to product-service
                channel.sendToQueue(
                    "PRODUCTS",
                    Buffer.from(JSON.stringify(newOrder)),
                );
            } catch (error) {
                console.error("Error processing order:", error);
            }
        });
    })
    .catch((error) => {
        console.error("Error connecting to RabbitMQ:", error);
        process.exit(1);
    });

///function to create order
function calculateTotalPrice(products) {
    let totalPrice = 0;
    products.forEach((product) => {
        totalPrice += product.price;
    });
    return totalPrice;
}
function createOrder(products, userEmail) {
    const order = new Order({
        products: products,
        user: userEmail,
        totalPrice: calculateTotalPrice(products),
    });
    order.save();
    return order;
}

// Routes

// Connect to MongoDB
mongoose
    .connect("mongodb://localhost:27017/order-service")
    .then(() => {
        console.log("order Service Connected to MongoDB");
    })
    .catch((err) => {
        console.log(err);
    });

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`order Server is running on port ${PORT}`);
});
