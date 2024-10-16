const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const IsUserAuthicated = require('../Middlewares/authMiddleware')


router.post('/addCity', IsUserAuthicated, (req, res) => {
    const { countryId, stateId, name } = req.body;


    if (!countryId || !stateId || !name) {
        return res.status(400).json({ error: 'countryId, stateId, and name are required', status: "false" });
    }


    const status = 1;  // Default status is active (1)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');  // Current timestamp in IST
    const createdId = createdDate;  // Using the current timestamp as the createdId
    const updatedId = createdDate;  // Using the current timestamp as the updatedId

    const query = `
        INSERT INTO city
        (countryId, stateId, name, status, createdId, updatedId)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
        countryId,
        stateId,
        name.toUpperCase(), // Convert name to uppercase
        status,  // Default status is 1
        createdId,  // Set createdId as the current timestamp
        updatedId,  // Set updatedId as the current timestamp
    ];

    // Insert the new city into the database
    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Successfully added the new city
        res.status(201).json({
            message: 'City added successfully',
            status: "true",
            cityId: results.insertId
        });
    });
});



router.put('/editCity/:cityId', IsUserAuthicated, (req, res) => {
    const { cityId } = req.params;
    const { countryId, stateId, name, status } = req.body;

    // Validate required inputs
    if (!countryId || !stateId || !name) {
        return res.status(400).json({ error: 'countryId, stateId, and name are required', status: "false" });
    }

    // Format the current timestamp for IST (Indian Standard Time)
    const updatedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update city details including updatedDate
    const updateQuery = `
        UPDATE city
        SET countryId = ?, stateId = ?, name = ?, status = ?, updatedId = ?
        WHERE cityId = ?;
    `;
    const values = [countryId, stateId, name.toUpperCase(), status, updatedDate, cityId];

    // Execute the update query
    dbConfig.query(updateQuery, values, (err, updateResults) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }


        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'City not found', status: "false" });
        }

        // Fetch the updated city details
        const fetchQuery = 'SELECT * FROM city WHERE cityId = ?';
        dbConfig.query(fetchQuery, [cityId], (err, fetchResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            if (fetchResults.length === 0) {
                return res.status(404).json({ error: 'City not found', status: "false" });
            }

            const updatedCity = fetchResults[0];

            // Successfully updated the city
            res.status(200).json({
                message: 'City updated successfully',
                status: "true",
                city: updatedCity
            });
        });
    });
});


router.put('/deleteCity/:cityId', IsUserAuthicated, (req, res) => {
    const { cityId } = req.params;

    // SQL query to update the city's status to 2 (soft delete)
    const query = `
        UPDATE city
        SET status = 2
        WHERE cityId = ?;
    `;
    const values = [cityId];


    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected (i.e., city exists)
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'City not found', status: "false" });
        }

        // Successfully soft deleted the city
        res.status(200).json({ message: 'City deleted successfully', status: "true" });
    });
});

router.put('/toggleCityStatus/:cityId', IsUserAuthicated, (req, res) => {
    const { cityId } = req.params;

    // SQL query to fetch the current status of the city
    const selectQuery = 'SELECT status FROM city WHERE cityId = ?';
    const updateQuery = 'UPDATE city SET status = ? WHERE cityId = ?';

    // Fetch the current status of the city
    dbConfig.query(selectQuery, [cityId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if the city exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'City not found', status: "false" });
        }

        // Toggle status: if 1 (active), change to 0 (inactive); if 0, change to 1
        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status of the city
        dbConfig.query(updateQuery, [newStatus, cityId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            // Successfully toggled the city status
            res.status(200).json({ message: 'City status updated successfully', status: "true" });
        });
    });
});


router.get('/cities', IsUserAuthicated, (req, res) => {
    const { page = 1, limit = 10, search = '', countryId = '', stateId = '' } = req.query;
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // Base SQL query for fetching cities
    let selectQuery = `
        SELECT *
        FROM city
        WHERE status != 2
    `;

    // Prepare query conditions and values
    const queryConditions = [];
    const queryValues = [];

    // Add search condition for city name
    if (search) {
        queryConditions.push(`(name LIKE ?)`);
        queryValues.push(`%${search}%`);
    }

    // Add filter condition for countryId
    if (countryId) {
        queryConditions.push(`countryId = ?`);
        queryValues.push(countryId);
    }

    // Add filter condition for stateId
    if (stateId) {
        queryConditions.push(`stateId = ?`);
        queryValues.push(stateId);
    }

    // Append conditions to the base query if any exist
    if (queryConditions.length > 0) {
        selectQuery += ' AND ' + queryConditions.join(' AND ');
    }

    // Add ordering and pagination
    selectQuery += ` ORDER BY createdDate DESC LIMIT ? OFFSET ?`;
    queryValues.push(parseInt(limit), parseInt(offset));

    // Execute the query to fetch cities
    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to count the total number of cities based on filters
        let countQuery = `
            SELECT COUNT(*) AS total
            FROM city
            WHERE status != 2
        `;

        // Prepare count query conditions
        const countQueryConditions = [];
        const countQueryValues = [];

        // Add search condition for count query
        if (search) {
            countQueryConditions.push(`(name LIKE ?)`);
            countQueryValues.push(`%${search}%`);
        }

        // Add filter condition for countryId in count query
        if (countryId) {
            countQueryConditions.push(`countryId = ?`);
            countQueryValues.push(countryId);
        }

        // Add filter condition for stateId in count query
        if (stateId) {
            countQueryConditions.push(`stateId = ?`);
            countQueryValues.push(stateId);
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

            // Return the list of cities with pagination metadata
            res.status(200).json({
                status: "true",
                cities: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});


router.get('/citydetails', IsUserAuthicated, (req, res) => {
    const { cityId } = req.query; // Extract cityId from query parameters

    // Validate cityId
    if (!cityId) {
        return res.status(400).json({ error: 'Please enter city ID', status: "false" });
    }

    const query = 'SELECT * FROM city WHERE cityId = ?'; // SQL query to fetch city details

    dbConfig.query(query, [cityId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if city exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'City not found', status: "false" });
        }

        const city = results[0]; // Get the first result (the city)

        // City found successfully
        res.status(200).json({
            message: 'City Details',
            status: "true",
            city: {
                cityId: city.cityId,
                name: city.name,
                countryId: city.countryId,
                stateId: city.stateId,
                status: city.status,
                createdDate: city.createdDate,
                updatedDate: city.updatedDate
            }
        });
    });
});

module.exports = router;