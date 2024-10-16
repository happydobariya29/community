const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const multer = require('multer');
const path = require('path');
const IsUserAuthicated = require('../Middlewares/authMiddleware')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/');
        cb(null, uploadPath); 
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit per file
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Images Only!');
        }
    }
}).fields([
    { name: 'photo', maxCount: 1 },   // Single primary photo
    { name: 'image1', maxCount: 1 },  // Optional image 1
    { name: 'image2', maxCount: 1 },  // Optional image 2
    { name: 'image3', maxCount: 1 },  // Optional image 3
    { name: 'image4', maxCount: 1 }   // Optional image 4
]);

// API for adding an event
router.post('/addevent',IsUserAuthicated, upload, (req, res) => {
    const { name, type, date, description, addedBy, link } = req.body;  // Extract addedBy from the request body
    const photo = req.file ? `uploads/${req.file.filename}` : null;

    // Extract optional images
    const image1 = req.files && req.files['image1'] ? `uploads/${req.files['image1'][0].filename}` : null;
    const image2 = req.files && req.files['image2'] ? `uploads/${req.files['image2'][0].filename}` : null;
    const image3 = req.files && req.files['image3'] ? `uploads/${req.files['image3'][0].filename}` : null;
    const image4 = req.files && req.files['image4'] ? `uploads/${req.files['image4'][0].filename}` : null;

    // Validate required inputs
    if (!name || !type || !date || !description || !addedBy) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Validate if addedBy exists in the user table
    dbConfig.query('SELECT userId FROM user WHERE userId = ?', [addedBy], (err, userResults) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ error: 'Invalid addedBy userId', status: "false" });
        }

        // Get current timestamp in Indian Standard Time (IST)
        const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

        // SQL query to insert a new event with createdDate and addedBy, including optional image fields
        const query = `
            INSERT INTO events
            (name, type, date, description, createdDate, photo, addedBy, link, image1, image2, image3, image4)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [name, type, date, description, createdDate, photo, addedBy, link, image1, image2, image3, image4];

        dbConfig.query(query, values, (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully added new event
            res.status(201).json({ message: 'Event added successfully', status: "true", eventId: results.insertId });
        });
    });
});


router.put('/editevent/:eventId',IsUserAuthicated, (req, res) => {
    upload(req, res, err => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message, status: "false" });
        } else if (err) {
            return res.status(500).json({ error: 'File upload failed', status: "false" });
        }

        const { eventId } = req.params;
        const { name, type, date, description, status, addedBy, link } = req.body;
        
        // Handle new file uploads for photo, image1, image2, image3, image4
        const newPhoto = req.files['photo'] ? `uploads/${req.files['photo'][0].filename}` : null;
        const newImage1 = req.files['image1'] ? `uploads/${req.files['image1'][0].filename}` : null;
        const newImage2 = req.files['image2'] ? `uploads/${req.files['image2'][0].filename}` : null;
        const newImage3 = req.files['image3'] ? `uploads/${req.files['image3'][0].filename}` : null;
        const newImage4 = req.files['image4'] ? `uploads/${req.files['image4'][0].filename}` : null;

        // Validate inputs
        if (!name || !type || !date || !description || !addedBy) {
            return res.status(400).json({ error: 'All fields are required', status: "false" });
        }

        // Validate if `addedBy` exists in the `user` table
        dbConfig.query('SELECT userId FROM user WHERE userId = ?', [addedBy], (err, userResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (userResults.length === 0) {
                return res.status(404).json({ error: 'Invalid addedBy userId', status: "false" });
            }

            // Fetch existing event to get the current images
            dbConfig.query('SELECT photo, image1, image2, image3, image4 FROM events WHERE eventId = ?', [eventId], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                if (results.length === 0) {
                    return res.status(404).json({ error: 'Event not found', status: "false" });
                }

                // Use existing images if no new images are uploaded
                const existingPhoto = results[0].photo;
                const existingImage1 = results[0].image1;
                const existingImage2 = results[0].image2;
                const existingImage3 = results[0].image3;
                const existingImage4 = results[0].image4;

                const photoToStore = newPhoto || existingPhoto;
                const image1ToStore = newImage1 || existingImage1;
                const image2ToStore = newImage2 || existingImage2;
                const image3ToStore = newImage3 || existingImage3;
                const image4ToStore = newImage4 || existingImage4;

                // SQL query to update the event, including the new images and `addedBy`
                const updateQuery = `
                    UPDATE events
                    SET name = ?, type = ?, date = ?, description = ?, status = ?, photo = ?, image1 = ?, image2 = ?, image3 = ?, image4 = ?, addedBy = ?, updatedDate = ?, link = ?
                    WHERE eventId = ?;
                `;
                const values = [
                    name, type, date, description, status, 
                    photoToStore, image1ToStore, image2ToStore, image3ToStore, image4ToStore, 
                    addedBy, moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), link, eventId
                ];

                dbConfig.query(updateQuery, values, (err, updateResults) => {
                    if (err) {
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).json({ error: 'An event with this name already exists', status: "false" });
                        }
                        return res.status(500).json({ error: err.message });
                    }

                    if (updateResults.affectedRows === 0) {
                        return res.status(404).json({ error: 'Event not found', status: "false" });
                    }

                    // Fetch updated event
                    dbConfig.query('SELECT * FROM events WHERE eventId = ?', [eventId], (err, fetchResults) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }

                        if (fetchResults.length === 0) {
                            return res.status(404).json({ error: 'Event not found', status: "false" });
                        }

                        res.status(200).json({ message: 'Event updated successfully', status: "true", event: fetchResults[0] });
                    });
                });
            });
        });
    });
});


// Endpoint to soft delete an event
router.put('/deleteevent/:eventId', IsUserAuthicated,(req, res) => {
    const { eventId } = req.params;

    // SQL query to update the event's status to 2 (soft delete)
    const query = `
        UPDATE events
        SET status = 2
        WHERE eventId = ?;
    `;
    const values = [eventId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Event not found', status: "false" });
        }

        // Successfully soft deleted the event
        res.status(200).json({ message: 'Event deleted successfully', status: "true" });
    });
});

//Api for change status
router.put('/toggleeventstatus/:eventId',IsUserAuthicated, (req, res) => {
    const { eventId } = req.params;

    // SQL query to fetch the current status of the event
    const selectQuery = 'SELECT status FROM events WHERE eventId = ?';
    const updateQuery = 'UPDATE events SET status = ? WHERE eventId = ?';

    dbConfig.query(selectQuery, [eventId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if event exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Event not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, eventId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully toggled the event status
            res.status(200).json({ message: 'Event status updated successfully', status: "true" });
        });
    });
});


router.get('/events',IsUserAuthicated, (req, res) => {
    const { page = 1, limit = 10, search = '', date = '' } = req.query; // Extract parameters from query
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // Base SQL query
    let selectQuery = `
        SELECT 
            e.eventId, 
            e.name, 
            e.type, 
            DATE_FORMAT(e.date, '%Y-%m-%d') AS date, 
            e.description, 
            e.status, 
            e.createdDate, 
            e.updatedDate, 
            e.photo, 
            e.image1, 
            e.image2, 
            e.image3, 
            e.image4, 
            e.addedBy,
            e.link,
            u.firstName AS addedByName
        FROM events e
        LEFT JOIN user u ON e.addedBy = u.userId
        WHERE e.status != 2
        ${search ? `AND (e.name LIKE ? OR e.description LIKE ?)` : ''}
        ${date ? `AND DATE(e.date) = ?` : ''}
        ORDER BY e.eventId DESC
        LIMIT ? OFFSET ?
    `;

    // Query values array
    let queryValues = [];
    if (search) {
        queryValues.push(`%${search}%`, `%${search}%`);
    }
    if (date) {
        queryValues.push(date); // Ensure date is in 'YYYY-MM-DD' format
    }
    queryValues.push(parseInt(limit), parseInt(offset));

    // Execute the query to fetch events
    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to count the total number of events based on filters
        let countQuery = `
            SELECT COUNT(*) AS total
            FROM events e
            LEFT JOIN user u ON e.addedBy = u.userId
            WHERE e.status != 2
            ${search ? `AND (e.name LIKE ? OR e.description LIKE ?)` : ''}
            ${date ? `AND DATE(e.date) = ?` : ''}
        `;

        let countQueryValues = [];
        if (search) {
            countQueryValues.push(`%${search}%`, `%${search}%`);
        }
        if (date) {
            countQueryValues.push(date);
        }

        // Execute the count query
        dbConfig.query(countQuery, countQueryValues, (err, countResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            const totalItems = countResults[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            // Return the list of events with pagination metadata
            res.status(200).json({
                status: "true",
                events: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});


// API for event details
router.get('/eventdetails',IsUserAuthicated ,(req, res) => {
    const { eventId } = req.query;

    // Validate if eventId is provided
    if (!eventId) {
        return res.status(400).json({ error: 'Please enter event ID', status: "false" });
    }

    // Query to fetch event details by eventId
    const query = 'SELECT * FROM events WHERE eventId = ?';

    dbConfig.query(query, [eventId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if the event exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Event not found', status: "false" });
        }

        const event = results[0];

        // Successfully retrieved event details
        res.status(200).json({
            message: 'Event Details',
            status: "true",
            event: {
                eventId: event.eventId,
                name: event.name,
                type: event.type,
                date: event.date,
                description: event.description,
                status: event.status,
                createdTime: event.createdTime,
                updatedTime: event.updatedTime,
                photo: event.photo,           // Main photo
                image1: event.image1,         // Additional images
                image2: event.image2,
                image3: event.image3,
                image4: event.image4,
                addedBy: event.addedBy,
                link: event.link
            }
        });
    });
});


module.exports = router;