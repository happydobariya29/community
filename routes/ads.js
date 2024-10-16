const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const multer = require('multer');
const path = require('path');

const storageAds = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/'); // Adjust path as needed
        cb(null, uploadPath); 
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// Initialize Multer upload for ads
const uploadAds = multer({
    storage: storageAds,
    limits: { fileSize: 2000000 }, // 2MB limit for ad images
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Only image files (jpeg, jpg, png, gif) are allowed!');
        }
    }
}).single('photo'); // Field name is 'photo'

// API for adding an ad
router.post('/addads', uploadAds, (req, res) => {
    const { title, type } = req.body;
    const photo = req.file ? `uploads/${req.file.filename}` : null;

    // Validate inputs
    if (!title || !type) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to insert a new ad with createdDate
    const query = `
        INSERT INTO ads (title, type, photo, createdDate, updatedDate)
        VALUES (?, ?, ?, ?, ?)
    `;
    const values = [title, type, photo, createdDate, createdDate];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Successfully added new ad
        res.status(201).json({ message: 'Ad added successfully', status: "true", adsId: results.insertId });
    });
});




// API for ad details
router.get('/adsdetails', (req, res) => {
    const { adsId } = req.query;
    if (!adsId) {
        return res.status(400).json({ error: 'Please enter ad ID', status: "false" });
    }
    const query = 'SELECT * FROM ads WHERE adsId = ?';

    dbConfig.query(query, [adsId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if ad exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Ad not found', status: "false" });
        }

        const ad = results[0];

        // Ad found successfully
        res.status(200).json({
            message: 'Ad Details',
            status: "true",
            ad: {
                adsId: ad.adsId,
                title: ad.title,
                type: ad.type,
                status: ad.status,
                photo: ad.photo,
                createdDate: ad.createdDate,
                updatedDate: ad.updatedDate
            }
        });
    });
});


// Endpoint to update an existing ad's details with photo handling
router.put('/editads/:adsId', (req, res) => {
  uploadAds(req, res, err => {
    if (err) {
      return res.status(400).send(err);
    }

    const { adsId } = req.params;
    const { title, type } = req.body;
    const photo = req.file ? `uploads/${req.file.filename}` : null; // Image path or null if not uploaded

    // Validate inputs
    if (!title || !type) {
      return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update an ad's details (with or without the photo)
    let updateQuery;
    let values;

    if (photo) {
      updateQuery = `
        UPDATE ads
        SET title = ?, type = ?, photo = ?, updatedDate = ?
        WHERE adsId = ?;
      `;
      values = [title, type, photo, indianDateTime, adsId];
    } else {
      updateQuery = `
        UPDATE ads
        SET title = ?, type = ?, updatedDate = ?
        WHERE adsId = ?;
      `;
      values = [title, type, indianDateTime, adsId];
    }

    dbConfig.query(updateQuery, values, (err, updateResults) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: 'An ad with this title already exists', status: "false" });
        }
        return res.status(500).json({ error: err.message, status: "false" });
      }

      // Check if any row was affected
      if (updateResults.affectedRows === 0) {
        return res.status(404).json({ error: 'Ad not found', status: "false" });
      }

      // Fetch the updated ad details
      const fetchQuery = 'SELECT * FROM ads WHERE adsId = ?';
      dbConfig.query(fetchQuery, [adsId], (err, fetchResults) => {
        if (err) {
          return res.status(500).json({ error: err.message, status: "false" });
        }

        if (fetchResults.length === 0) {
          return res.status(404).json({ error: 'Ad not found', status: "false" });
        }

        const updatedAd = fetchResults[0];

        // Successfully updated the ad
        res.status(200).json({ message: 'Ad updated successfully', status: "true", ad: updatedAd });
      });
    });
  });
});

// Endpoint to soft delete an advertisement
router.put('/deletead/:adsId', (req, res) => {
    const { adsId } = req.params;

    // SQL query to update the advertisement's status to 2 (soft delete)
    const query = `
        UPDATE ads
        SET status = 2
        WHERE adsId = ?;
    `;
    const values = [adsId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Advertisement not found', status: "false" });
        }

        // Successfully soft deleted the advertisement
        res.status(200).json({ message: 'Advertisement deleted successfully', status: "true" });
    });
});

// API to toggle the status of an advertisement
router.put('/toggleadstatus/:adsId', (req, res) => {
    const { adsId } = req.params;

    // SQL query to fetch the current status of the advertisement
    const selectQuery = 'SELECT status FROM ads WHERE adsId = ?';
    const updateQuery = 'UPDATE ads SET status = ? WHERE adsId = ?';

    dbConfig.query(selectQuery, [adsId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if advertisement exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Advertisement not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, adsId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            // Successfully toggled the advertisement status
            res.status(200).json({ message: 'Advertisement status updated successfully', status: "true" });
        });
    });
});


// Ads list with pagination
router.get('/ads', (req, res) => {
    const { page = 1, limit = 10 } = req.query; // Extract page and limit from query parameters
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // SQL query to fetch ads with pagination, sorted by createdDate in descending order
    const selectQuery = `
        SELECT adsId, title, type, photo, status, createdDate, updatedDate
        FROM ads
        WHERE status != 2
        ORDER BY createdDate DESC
        LIMIT ? OFFSET ?
    `;

    // Include pagination parameters in the query values
    const queryValues = [parseInt(limit), parseInt(offset)];

    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to get the total number of ads for pagination purposes
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM ads
            WHERE status != 2
        `;

        // Execute count query to get the total number of ads
        dbConfig.query(countQuery, [], (err, countResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            const totalItems = countResults[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            // Return the list of ads along with pagination metadata
            res.status(200).json({
                status: "true",
                ads: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});


module.exports = router;