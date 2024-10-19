const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const IsUserAuthicated = require('../Middlewares/authMiddleware')


router.post('/addNotifications', IsUserAuthicated, (req, res) => {
    const {userId , moduleName,  description , title} =req.body;
    if(!userId || !moduleName || !title|| !description){
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }
    const createdAt = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    const query = `
        INSERT INTO notification (userId, moduleName, title, description, createdAt)
        VALUES (?, ?, ?, ?, ?)
    `;
    const values = [userId, moduleName, title, description, createdAt];
    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        return res.status(200).json({
            message: 'Notification added successfully',
            status: "true",
            notificationId: results.insertId
        });
})
});


router.delete('/deleteNotification/:id', IsUserAuthicated, (req, res) => {
    const notificationId = req.params.id;

    // Check if notificationId is provided
    if (!notificationId) {
        return res.status(400).json({ error: 'Notification ID is required', status: "false" });
    }

    // SQL query to delete a notification by its ID
    const query = `DELETE FROM notification WHERE notificationId = ?`;

    // Execute the query
    dbConfig.query(query, [notificationId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if the notification was found and deleted
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Notification not found', status: "false" });
        }

        // Success response
        return res.status(200).json({
            message: 'Notification deleted successfully',
            status: "true"
        });
    });
});


router.get('/notifications', IsUserAuthicated, (req, res) => {
    const { page = 1, limit = 10, search = '', userId = '' } = req.query;
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // Base SQL query for fetching notifications
    let selectQuery = `
        SELECT *
        FROM notification
    `;

    // Prepare query conditions and values
    const queryConditions = [];
    const queryValues = [];

    // Add search condition for notification title or description
    if (search) {
        queryConditions.push(`(title LIKE ? OR description LIKE ?)`);
        queryValues.push(`%${search}%`, `%${search}%`);
    }

    // Add filter condition for userId
    if (userId) {
        queryConditions.push(`userId = ?`);
        queryValues.push(userId);
    }

    // Append conditions to the base query if any exist
    if (queryConditions.length > 0) {
        selectQuery += ' AND ' + queryConditions.join(' AND ');
    }

    // Add ordering and pagination
    selectQuery += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    queryValues.push(parseInt(limit), parseInt(offset));

    // Execute the query to fetch notifications
    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to count the total number of notification entries based on filters
        let countQuery = `
            SELECT COUNT(*) AS total
            FROM notification
        `;

        // Prepare count query conditions
        const countQueryConditions = [];
        const countQueryValues = [];

        // Add search condition for count query
        if (search) {
            countQueryConditions.push(`(title LIKE ? OR description LIKE ?)`);
            countQueryValues.push(`%${search}%`, `%${search}%`);
        }

        // Add filter condition for userId in count query
        if (userId) {
            countQueryConditions.push(`userId = ?`);
            countQueryValues.push(userId);
        }

        // Append conditions to the count query if any exist
        if (countQueryConditions.length > 0) {
            countQuery += ' AND ' + countQueryConditions.join(' AND ');
        }

        // Execute the count query
        dbConfig.query(countQuery, countQueryValues, (err, countResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            const totalItems = countResults[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            // Return the list of notification entries with pagination metadata
            res.status(200).json({
                status: "true",
                notifications: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});



module.exports = router;

