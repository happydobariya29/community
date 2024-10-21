const express = require('express');
const router = express.Router();
const moment = require('moment-timezone'); // For timestamp handling
const dbConfig = require("./dbconfig"); // Database configuration
const IsUserAuthicated = require('../Middlewares/authMiddleware'); // Authentication middleware

// Route to add feedback
router.post('/addFeedback', (req, res) => {
    const { name, contact_no, email, comment, userId } = req.body;

    if (!name || !contact_no || !email || !comment || !userId) {
        return res.status(400).json({
            error: 'name, contact_no, email, comment, and userId are required',
            status: "false"
        });
    }

    // Check if userId exists in the user table
    const checkUserQuery = `SELECT * FROM user WHERE userId = ?`;
    dbConfig.query(checkUserQuery, [userId], (err, userResults) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }
        if (userResults.length === 0) {
            return res.status(400).json({ error: 'userId does not exist', status: "false" });
        }

        // Prepare values for insertion
        const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

        const query = `
            INSERT INTO feedback (name, contact_no, email, comment, userId, created, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [name, contact_no, email, comment, userId, createdDate, 1]; // Setting initial status to 1

        // Insert the feedback into the database
        dbConfig.query(query, values, (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            res.status(201).json({
                message: 'Feedback added successfully',
                status: "true",
                feedbackId: results.insertId
            });
        });
    });
});

// Endpoint to soft delete feedback
router.put('/deleteFeedback/:feedbackId', (req, res) => {
    const { feedbackId } = req.params;

    // SQL query to update the feedback's status to 2 (soft delete)
    const query = `
        UPDATE feedback
        SET status = 2
        WHERE id = ?;
    `;
    const values = [feedbackId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Feedback not found', status: "false" });
        }

        // Successfully soft deleted the feedback
        res.status(200).json({ message: 'Feedback deleted successfully', status: "true" });
    });
});

// Route to get feedback with pagination and search filters
router.get('/feedback', (req, res) => {
    const { page = 1, limit = 10, search = '', userId = '' } = req.query;
    const offset = (page - 1) * limit;

    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // Base SQL query for fetching feedback, excluding those with status 2
    let selectQuery = `SELECT * FROM feedback WHERE status <> 2`;

    // Prepare query conditions and values
    const queryConditions = [];
    const queryValues = [];

    // Add search condition for feedback name
    if (search) {
        queryConditions.push(`name LIKE ?`);
        queryValues.push(`%${search}%`);
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
    selectQuery += ` ORDER BY created DESC LIMIT ? OFFSET ?`;
    queryValues.push(parseInt(limit), parseInt(offset));

    // Execute the query to fetch feedback
    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to count the total number of feedback entries based on filters
        let countQuery = `SELECT COUNT(*) AS total FROM feedback WHERE status <> 2`;
        const countQueryConditions = [...queryConditions];
        const countQueryValues = [...queryValues.slice(0, queryValues.length - 2)]; // Exclude limit and offset

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

            // Return the list of feedback entries with pagination metadata
            res.status(200).json({
                status: "true",
                feedback: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});

module.exports = router;
