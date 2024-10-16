const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const app = express();
app.use(express.json());
const IsUserAuthicated = require('../Middlewares/authMiddleware')
// API for adding a matrimonial profile
router.post('/addmatrimonial',IsUserAuthicated ,(req, res) => {
    const {
        contactNumber,
        biodata,
        firstName,
        middleName,
        lastName,
        age,
        profilePic,
        dateOfBirth
    } = req.body;

    // Validate inputs
    if (!contactNumber || !biodata || !firstName || !lastName || !age || !dateOfBirth) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
    const updatedDate = createdDate; // Initialize updatedDate with the same value as createdDate

    // SQL query to insert a new matrimonial profile with all the fields
    const query = `
        INSERT INTO matrimonialprofiles
        (contactNumber, biodata, createdDate, updatedDate, firstName, middleName, lastName, age, profilePic, dateOfBirth)
        VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [contactNumber, biodata, createdDate, updatedDate, firstName, middleName, lastName, age, profilePic, dateOfBirth];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Successfully added new matrimonial profile
        res.status(201).json({ message: 'Matrimonial profile added successfully', status: "true", matrimonialId: results.insertId });
    });
});


// Endpoint to update an existing matrimonial profile's details
router.put('/editmatrimonial/:matrimonialId', IsUserAuthicated ,(req, res) => {
    const { matrimonialId } = req.params;
    const {
        contactNumber,
        biodata,
        firstName,
        middleName,
        lastName,
        age,
        profilePic,
        dateOfBirth
    } = req.body;

    // Validate inputs
    if (!contactNumber || !biodata || !firstName || !lastName || !age || !dateOfBirth) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update a matrimonial profile's details including updatedDate
    const updateQuery = `
        UPDATE matrimonialprofiles
        SET contactNumber = ?, biodata = ?, firstName = ?, middleName = ?, lastName = ?,
            age = ?, profilePic = ?, dateOfBirth = ?, updatedDate = ?
        WHERE matrimonialId = ?;
    `;
    const values = [contactNumber, biodata, firstName, middleName, lastName, age, profilePic, dateOfBirth, indianDateTime, matrimonialId];

    dbConfig.query(updateQuery, values, (err, updateResults) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'A matrimonial profile with these details already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'Matrimonial profile not found', status: "false" });
        }

        // Fetch the updated matrimonial profile details
        const fetchQuery = 'SELECT * FROM matrimonialprofiles WHERE matrimonialId = ?';
        dbConfig.query(fetchQuery, [matrimonialId], (err, fetchResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            if (fetchResults.length === 0) {
                return res.status(404).json({ error: 'Matrimonial profile not found', status: "false" });
            }

            const updatedMatrimonial = fetchResults[0];

            // Successfully updated the matrimonial profile
            res.status(200).json({ message: 'Matrimonial profile updated successfully', status: "true", matrimonial: updatedMatrimonial });
        });
    });
});



// Endpoint to soft delete a matrimonial profile
router.put('/deletematrimonial/:matrimonialId',IsUserAuthicated , (req, res) => {
    const { matrimonialId } = req.params;

    // SQL query to update the matrimonial profile's status to 2 (soft delete)
    const query = `
        UPDATE matrimonialprofiles
        SET status = 2
        WHERE matrimonialId = ?;
    `;
    const values = [matrimonialId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Matrimonial profile not found', status: "false" });
        }

        // Successfully soft deleted the matrimonial profile
        res.status(200).json({ message: 'Matrimonial profile deleted successfully', status: "true" });
    });
});




// API to toggle the status of a matrimonial profile
router.put('/togglematrimonialstatus/:matrimonialId',IsUserAuthicated , (req, res) => {
    const { matrimonialId } = req.params;

    // SQL query to fetch the current status of the matrimonial profile
    const selectQuery = 'SELECT status FROM matrimonialprofiles WHERE matrimonialId = ?';
    const updateQuery = 'UPDATE matrimonialprofiles SET status = ? WHERE matrimonialId = ?';

    dbConfig.query(selectQuery, [matrimonialId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if matrimonial profile exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Matrimonial profile not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, matrimonialId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            // Successfully toggled the matrimonial profile status
            res.status(200).json({ message: 'Matrimonial profile status updated successfully', status: "true" });
        });
    });
});

// Matrimonial profiles list
router.get('/matrimonialprofiles',IsUserAuthicated , (req, res) => {
    // SQL query to fetch all matrimonial profiles sorted by createdDate in descending order
    const selectQuery = 'SELECT * FROM matrimonialprofiles WHERE status != 2 ORDER BY createdDate DESC';

    dbConfig.query(selectQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if there are matrimonial profiles
        if (results.length === 0) {
            return res.status(404).json({ error: 'No matrimonial profiles found', status: "false" });
        }

        // Return the list of matrimonial profiles
        res.status(200).json({ status: "true", matrimonialProfiles: results });
    });
});

// API for matrimonial profile details endpoint
router.get('/matrimonialdetails',IsUserAuthicated , (req, res) => {
    const { matrimonialId } = req.body;

    if (!matrimonialId) {
        return res.status(400).json({ error: 'Please provide matrimonial ID', status: "false" });
    }

    // SQL query to fetch matrimonial profile details including additional fields
    const query = `
        SELECT matrimonialId, contactNumber, firstName, middleName, lastName, age, dateOfBirth, profilePic, biodata, status, createdDate, updatedDate
        FROM matrimonialprofiles
        WHERE matrimonialId = ?
    `;

    dbConfig.query(query, [matrimonialId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if matrimonial profile exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Matrimonial profile not found', status: "false" });
        }

        const matrimonialProfile = results[0];

        // Matrimonial profile details found successfully
        res.status(200).json({
            message: 'Matrimonial Profile Details',
            status: "true",
            matrimonialProfile: matrimonialProfile
        });
    });
});

module.exports = router;