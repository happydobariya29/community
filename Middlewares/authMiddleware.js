const jwt = require('jsonwebtoken');
const dbConfig = require('../../CommuNetWeb/routes/dbconfig');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token is missing', status: "false" });
    }

    // Verify the token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token', status: "false" });
        }

        // Check if the token exists in the database
        const query = 'SELECT * FROM token WHERE token = ? LIMIT 1';
        dbConfig.query(query, [token], (dbErr, results) => {
            if (dbErr) {
                return res.status(500).json({ error: 'Database error', status: "false" });
            }

            if (results.length === 0) {
                return res.status(403).json({ error: 'Token not found in the database', status: "false" });
            }

            // Token is valid and exists in the database
            req.user = user;
            console.log(user); // Logging the user information from the JWT payload
            next(); // Proceed to the next middleware or route handler
        });
    });
};

module.exports = authenticateToken;
