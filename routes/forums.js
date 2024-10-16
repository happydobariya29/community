const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const IsUserAuthicated = require('../Middlewares/authMiddleware')

// API for adding a forum
router.post('/addforum',IsUserAuthicated, (req, res) => {
    const { userId, forumCategoryId, title, description } = req.body;

    // Validate inputs
    if (!userId || !forumCategoryId || !title || !description) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    const updatedDate = createdDate;

    // SQL query to insert a new forum
    const query = `
        INSERT INTO forums (userId, forumCategoryId, title, description, createdDate, updatedDate)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [userId, forumCategoryId, title, description, createdDate, updatedDate];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Successfully added new forum, return the new forum id
        res.status(201).json({ message: 'Forum added successfully', status: "true", id: results.insertId });
    });
});

// API for editing a forum
router.put('/editforum/:id',IsUserAuthicated, (req, res) => {
    const { id } = req.params;
    const { userId, forumCategoryId, title, description } = req.body;

    // Validate inputs
    if (!userId || !forumCategoryId || !title || !description) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const updatedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update the forum
    const query = `
        UPDATE forums
        SET userId = ?, forumCategoryId = ?, title = ?, description = ?, updatedDate = ?
        WHERE id = ?
    `;
    const values = [userId, forumCategoryId, title, description, updatedDate, id];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Forum not found', status: "false" });
        }

        // Successfully updated the forum
        res.status(200).json({ message: 'Forum updated successfully', status: "true" });
    });
});

// Endpoint to soft delete a forum
router.put('/deleteforum/:id',IsUserAuthicated, (req, res) => {
    const { id } = req.params;

    // SQL query to update the forum's status to 2 (soft delete)
    const query = `
        UPDATE forums
        SET status = 2
        WHERE id = ?;
    `;
    const values = [id];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Forum not found', status: "false" });
        }

        // Successfully soft deleted the forum
        res.status(200).json({ message: 'Forum soft deleted successfully', status: "true" });
    });
});

// Endpoint to change the status of a forum
router.put('/toggleforumstatus/:id',IsUserAuthicated, (req, res) => {
    const { id } = req.params;

    // SQL query to fetch the current status of the forum
    const selectQuery = 'SELECT status FROM forums WHERE id = ?';
    const updateQuery = 'UPDATE forums SET status = ? WHERE id = ?';

    dbConfig.query(selectQuery, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if forum exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Forum not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, id], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            // Successfully toggled the forum status
            res.status(200).json({ message: 'Forum status updated successfully', status: "true" });
        });
    });
});

// Endpoint to fetch all forums sorted by createdDate in descending order
router.get('/forums', IsUserAuthicated,(req, res) => {
    // SQL query to fetch all forums sorted by createdDate in descending order where status is not 2
    const selectQuery = 'SELECT * FROM forums WHERE status != 2 ORDER BY createdDate DESC';

    dbConfig.query(selectQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if there are forums
        if (results.length === 0) {
            return res.status(404).json({ error: 'No forums found', status: "false" });
        }

        // Return the list of forums
        res.status(200).json({ status: "true", forums: results });
    });
});

// Endpoint to fetch details of a specific forum
router.get('/forumdetails/:forumId',IsUserAuthicated, (req, res) => {
    const { forumId } = req.params;

    // SQL query to fetch details of the forum by forumId
    const selectQuery = 'SELECT * FROM forums WHERE id = ?';

    dbConfig.query(selectQuery, [forumId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if forum exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Forum not found', status: "false" });
        }

        // Forum found successfully
        const forum = results[0];
        res.status(200).json({
            message: 'Forum Details',
            status: "true",
            forum: {
                id: forum.id,
                userId: forum.userId,
                forumCategoryId: forum.forumCategoryId,
                title: forum.title,
                description: forum.description,
                status: forum.status,
                createdDate: forum.createdDate,
                updatedDate: forum.updatedDate
            }
        });
    });
});

// API for adding a forum comment
router.post('/addcomment',IsUserAuthicated, (req, res) => {
    const { userId, forumId, parentId, comments } = req.body;

    // Validate inputs
    if (!userId || !forumId || !comments) {
        return res.status(400).json({ error: 'userId, forumId, and comments are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    const updatedDate = createdDate;
    const status = 1; // Assuming status 1 means active comment

    // SQL query to insert a new comment
    const query = `
        INSERT INTO forum_comments (userId, forumId, parentId, comments, status, createdDate, updatedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [userId, forumId, parentId, comments, status, createdDate, updatedDate];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Successfully added new comment, return the new comment id
        res.status(201).json({ message: 'Comment added successfully', status: "true", commentId: results.insertId });
    });
});


// Endpoint to edit a forum comment
router.put('/editcomment/:commentId', IsUserAuthicated,(req, res) => {
    const { commentId } = req.params;
    const { userId, forumId, parentId, comments } = req.body;

    // Validate inputs
    if (!userId || !forumId || !comments) {
        return res.status(400).json({ error: 'UserId, ForumId, and Comments are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const updatedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update a forum comment
    const query = `
        UPDATE forum_comments
        SET userId = ?, forumId = ?, parentId = ?, comments = ?, updatedDate = ?
        WHERE commentId = ?
    `;
    const values = [userId, forumId, parentId, comments, updatedDate, commentId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Comment not found', status: "false" });
        }

        // Successfully updated the forum comment
        res.status(200).json({ message: 'Comment updated successfully', status: "true" });
    });
});

// Endpoint to soft delete a forum comment
router.put('/deletecomment/:commentId',IsUserAuthicated, (req, res) => {
    const { commentId } = req.params;

    // SQL query to update the comment's status to 2 (soft delete)
    const query = `
        UPDATE forum_comments
        SET status = 2
        WHERE commentId = ?
    `;
    const values = [commentId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Comment not found', status: "false" });
        }

        // Successfully soft deleted the forum comment
        res.status(200).json({ message: 'Comment deleted successfully', status: "true" });
    });
});

// Endpoint to toggle the status of a forum comment
router.put('/togglecommentstatus/:commentId',IsUserAuthicated, (req, res) => {
    const { commentId } = req.params;

    // SQL query to fetch the current status of the comment
    const selectQuery = 'SELECT status FROM forum_comments WHERE commentId = ?';
    const updateQuery = 'UPDATE forum_comments SET status = ? WHERE commentId = ?';

    dbConfig.query(selectQuery, [commentId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if comment exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Comment not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, commentId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully toggled the comment status
            res.status(200).json({ message: 'Comment status updated successfully', status: "true" });
        });
    });
});

// Endpoint to list all comments with status not equal to 2, sorted by createdDate in descending order
router.get('/comments', IsUserAuthicated,(req, res) => {
    // SQL query to fetch all comments with status not equal to 2, sorted by createdDate in descending order
    const selectQuery = 'SELECT * FROM forum_comments WHERE status != 2 ORDER BY createdDate DESC';

    dbConfig.query(selectQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if there are comments
        if (results.length === 0) {
            return res.status(404).json({ error: 'No comments found', status: "false" });
        }

        // Return the list of comments
        res.status(200).json({ status: "true", comments: results });
    });
});


// Endpoint to get the details of a specific comment
router.get('/commentdetails/:commentId',IsUserAuthicated, (req, res) => {
    const { commentId } = req.params;

    // Validate input
    if (!commentId) {
        return res.status(400).json({ error: 'Comment ID is required', status: "false" });
    }

    // SQL query to fetch the comment details based on commentId
    const selectQuery = 'SELECT * FROM forum_comments WHERE commentId = ?';

    dbConfig.query(selectQuery, [commentId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if the comment exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Comment not found', status: "false" });
        }

        // Return the comment details
        const comment = results[0];
        res.status(200).json({
            message: 'Comment Details',
            status: "true",
            comment: {
                commentId: comment.commentId,
                userId: comment.userId,
                forumId: comment.forumId,
                parentId: comment.parentId,
                comments: comment.comments,
                status: comment.status,
                createdDate: comment.createdDate,
                updatedDate: comment.updatedDate
            }
        });
    });
});

module.exports = router;