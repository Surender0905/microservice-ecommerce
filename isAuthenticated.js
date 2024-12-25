const jwt = require("jsonwebtoken");

async function isAuthenticated(req, res, next) {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Authentication failed" });
    }
}

module.exports = isAuthenticated;
