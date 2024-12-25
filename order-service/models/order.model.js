const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        products: [
            {
                productId: String,
            },
        ],
        user: String,
        totalPrice: Number,
    },
    { timestamps: true },
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
