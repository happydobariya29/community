const dbConfig = require('../../CommuNetWeb/routes/dbconfig');

const authorizeUserType = (req, res, next) => {
    const userId = req.user.userId; // Assuming userId is available in req.user from the previous middleware
    if (!userId) {
        return res.status(401).json({ error: 'Authentication required', status: "false" });
    }
    // Query to check the user's userType in the database
    const query = 'SELECT userType FROM user WHERE userId = ? LIMIT 1';
    dbConfig.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error', status: "false" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        const user = results[0];

        // Check if the userType is 'admin' or 'family head'
        if (user.userType === 'admin' || user.userType === 'family head') {
            next(); // User is authorized, proceed to the next middleware or route handler
        } else {
            return res.status(403).json({ error: 'Access denied: insufficient permissions', status: "false" });
        }
    });
};

module.exports = authorizeUserType;
