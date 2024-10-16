const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const multer = require('multer');
const IsUserAuthicated = require('../Middlewares/authMiddleware')
const upload = multer();

// API for adding an announcement
router.post('/addannouncement', IsUserAuthicated,  upload.none(), (req, res) => {
    const { announcementTitle, announcementType, announcementDate, announcementDescription } = req.body;

    // Validate inputs
    if (!announcementTitle || !announcementType || !announcementDate || !announcementDescription) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to insert a new announcement with createdDate
    const query = `
        INSERT INTO announcements
        (announcementTitle, announcementType, announcementDate, announcementDescription, createdDate)
        VALUES (?, ?, ?, ?, ?)
    `;
    const values = [announcementTitle, announcementType, announcementDate, announcementDescription, createdDate];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Successfully added new announcement
        res.status(201).json({ message: 'Announcement added successfully', status: "true", announcementId: results.insertId });
    });
});


// API for announcement details
router.get('/announcementdetails', IsUserAuthicated,(req, res) => {
    const { announcementId } = req.query;
    if (!announcementId) {
        return res.status(400).json({ error: 'Please enter announcement ID', status: "false" });
    }
    const query = 'SELECT * FROM announcements WHERE announcementId = ?';

    dbConfig.query(query, [announcementId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if announcement exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Announcement not found', status: "false" });
        }

        const announcement = results[0];

        // Announcement found successfully
        res.status(200).json({
            message: 'Announcement Details',
            status: "true",
            announcement: {
                announcementId: announcement.announcementId,
                announcementTitle: announcement.announcementTitle,
                announcementType: announcement.announcementType,
                announcementDate: announcement.announcementDate,
                announcementDescription: announcement.announcementDescription,
                status: announcement.status,
                createdDate: announcement.createdDate,
                updatedDate: announcement.updatedDate
            }
        });
    });
});

// Endpoint to update an existing announcement's details
router.put('/editannouncement/:announcementId',IsUserAuthicated ,upload.none(), (req, res) => {
    const { announcementId } = req.params;
    const { announcementTitle, announcementType, announcementDate, announcementDescription } = req.body;

    // Validate inputs
    if (!announcementTitle || !announcementType || !announcementDate || !announcementDescription) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update an announcement's details including updatedDate
    const updateQuery = `
        UPDATE announcements
        SET announcementTitle = ?, announcementType = ?, announcementDate = ?, announcementDescription = ?, updatedDate = ?
        WHERE announcementId = ?;
    `;
    const values = [announcementTitle, announcementType, announcementDate, announcementDescription, indianDateTime, announcementId];

    dbConfig.query(updateQuery, values, (err, updateResults) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'An announcement with this title already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'Announcement not found', status: "false" });
        }

        // Fetch the updated announcement details
        const fetchQuery = 'SELECT * FROM announcements WHERE announcementId = ?';
        dbConfig.query(fetchQuery, [announcementId], (err, fetchResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            if (fetchResults.length === 0) {
                return res.status(404).json({ error: 'Announcement not found', status: "false" });
            }

            const updatedAnnouncement = fetchResults[0];

            // Successfully updated the announcement
            res.status(200).json({ message: 'Announcement updated successfully', status: "true", announcement: updatedAnnouncement });
        });
    });
});


// Endpoint to soft delete an announcement
router.put('/deleteannouncement/:announcementId', IsUserAuthicated,(req, res) => {
    const { announcementId } = req.params;

    // SQL query to update the announcement's status to 2 (soft delete)
    const query = `
        UPDATE announcements
        SET status = 2
        WHERE announcementId = ?;
    `;
    const values = [announcementId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Announcement not found', status: "false" });
        }

        // Successfully soft deleted the announcement
        res.status(200).json({ message: 'Announcement deleted successfully', status: "true" });
    });
});


// API to toggle the status of an announcement
router.put('/toggleannouncementstatus/:announcementId',IsUserAuthicated , (req, res) => {
    const { announcementId } = req.params;

    // SQL query to fetch the current status of the announcement
    const selectQuery = 'SELECT status FROM announcements WHERE announcementId = ?';
    const updateQuery = 'UPDATE announcements SET status = ? WHERE announcementId = ?';

    dbConfig.query(selectQuery, [announcementId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if announcement exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Announcement not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, announcementId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully toggled the announcement status
            res.status(200).json({ message: 'Announcement status updated successfully', status: "true" });
        });
    });
});


// // Announcements list with pagination
// router.get('/announcements', (req, res) => {
//     const { page = 1, limit = 10 } = req.query; // Extract page and limit from query parameters
//     const offset = (page - 1) * limit;

//     // Validate pagination parameters
//     if (page < 1 || limit < 1) {
//         return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
//     }

//     // SQL query to fetch announcements with pagination, sorted by createdDate in descending order
//     const selectQuery = `
//         SELECT *
//         FROM announcements
//         WHERE status != 2
//         ORDER BY createdDate DESC
//         LIMIT ? OFFSET ?
//     `;

//     // Include pagination parameters in the query values
//     const queryValues = [parseInt(limit), parseInt(offset)];

//     dbConfig.query(selectQuery, queryValues, (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }

//         // Query to get the total number of announcements for pagination purposes
//         const countQuery = `
//             SELECT COUNT(*) AS total
//             FROM announcements
//             WHERE status != 2
//         `;

//         // Execute count query to get the total number of announcements
//         dbConfig.query(countQuery, [], (err, countResults) => {
//             if (err) {
//                 return res.status(500).json({ error: err.message, status: "false" });
//             }

//             const totalItems = countResults[0].total;
//             const totalPages = Math.ceil(totalItems / limit);

//             // Return the list of announcements along with pagination metadata
//             res.status(200).json({
//                 status: "true",
//                 announcements: results,
//                 totalItems,
//                 totalPages,
//                 currentPage: parseInt(page),
//                 itemsPerPage: parseInt(limit)
//             });
//         });
//     });
// });

// Announcements list with pagination and search functionality
router.get('/announcements',IsUserAuthicated,  (req, res) => {
    const { page = 1, limit = 10, search = '', date = '' } = req.query; // Extract parameters from query
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // Base SQL query for fetching announcements
    let selectQuery = `
        SELECT *
        FROM announcements
        WHERE status != 2
    `;

    // Prepare query conditions and values
    const queryConditions = [];
    const queryValues = [];

    // Add search condition for announcement title and type
    if (search) {
        queryConditions.push(`(announcementTitle LIKE ? OR announcementType LIKE ?)`);
        queryValues.push(`%${search}%`, `%${search}%`);
    }

    // Add date filter condition
    if (date) {
        queryConditions.push(`DATE(announcementDate) = ?`);
        queryValues.push(date); // Ensure date is in 'YYYY-MM-DD' format
    }

    // Append conditions to the base query if any exist
    if (queryConditions.length > 0) {
        selectQuery += ' AND ' + queryConditions.join(' AND ');
    }

    // Add ordering and pagination
    selectQuery += ` ORDER BY createdDate DESC LIMIT ? OFFSET ?`;
    queryValues.push(parseInt(limit), parseInt(offset));

    // Execute the query to fetch announcements
    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to count the total number of announcements based on filters
        let countQuery = `
            SELECT COUNT(*) AS total
            FROM announcements
            WHERE status != 2
        `;

        // Prepare count query conditions
        const countQueryConditions = [];
        const countQueryValues = [];

        // Add search condition for count query
        if (search) {
            countQueryConditions.push(`(announcementTitle LIKE ? OR announcementType LIKE ?)`);
            countQueryValues.push(`%${search}%`, `%${search}%`);
        }

        // Add date filter condition for count query
        if (date) {
            countQueryConditions.push(`DATE(announcementDate) = ?`);
            countQueryValues.push(date);
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

            // Return the list of announcements with pagination metadata
            res.status(200).json({
                status: "true",
                announcements: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});


module.exports = router;