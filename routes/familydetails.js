const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const IsUserAuthicated = require('../Middlewares/authMiddleware')
const userRole = require('../Middlewares/authorizeUserType')
// API for adding family details
router.post('/addfamilymember',IsUserAuthicated , userRole ,(req, res) => {
    const { firstName, lastName, contactNumber, email, age, gender, bloodGroup, education, address, countryId, stateId, cityId, userType, dateOfBirth, parentId, photo } = req.body;

    // Validate inputs
    if (!firstName || !lastName || !age || !gender || !education || !address || !countryId || !stateId || !cityId || !userType || !dateOfBirth || !parentId) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Get current timestamp in Indian Standard Time (IST)
    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to insert a new family member with createdDate
    const query = `
        INSERT INTO user
        (firstName, lastName, contactNumber, email, dateOfBirth, age, gender, bloodGroup, education, address, countryId, stateId, cityId, createdDate, userType, parentId, photo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [firstName, lastName, contactNumber, email, dateOfBirth, age, gender, bloodGroup, education, address, countryId, stateId, cityId, createdDate, userType, parentId, photo];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'This contact number already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message });
        }

        // Successfully added new family member
        res.status(201).json({ message: 'Family details added successfully', status: "true", userId: results.insertId });
    });
});

// Endpoint to update an existing family member's details
router.put('/editfamilymember/:memberId',IsUserAuthicated , userRole , (req, res) => {
    const { memberId } = req.params;
    const { firstName, lastName, contactNumber, email, dateOfBirth, age, gender, bloodGroup, education, address, countryId, stateId, cityId, userId, userType } = req.body;

    // Validate inputs
    if (!firstName || !lastName || !dateOfBirth || !age || !gender|| !education || !address || !countryId || !stateId || !cityId || !userId || !userType) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update a family member's details including updatedDate
    const updateQuery = `
        UPDATE familydetails
        SET firstName = ?, lastName = ?, contactNumber = ?, email = ?, age = ?, gender = ?, bloodGroup = ?, education = ?, address = ?, countryId = ?, stateId = ?, cityId = ?, userId = ?, userType = ?, updatedDate = ?, dateOfBirth=?
        WHERE memberId = ?;
    `;
    const values = [firstName, lastName, contactNumber, email, dateOfBirth, age, gender, bloodGroup, education, address, countryId, stateId, cityId, userId, userType, indianDateTime, memberId];

    dbConfig.query(updateQuery, values, (err, updateResults) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'This contact number already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'Family member not found', status: "false" });
        }

        // Fetch the updated family member details
        const fetchQuery = 'SELECT * FROM familydetails WHERE memberId = ?';
        dbConfig.query(fetchQuery, [memberId], (err, fetchResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (fetchResults.length === 0) {
                return res.status(404).json({ error: 'Family member not found', status: "false" });
            }

            const updatedFamilyMember = fetchResults[0];

            // Successfully updated the family member
            res.status(200).json({ message: 'Family member updated successfully', status: "true", familyMember: updatedFamilyMember });
        });
    });
});

// Endpoint to soft delete a family member
router.put('/deletefamilymember/:memberId', IsUserAuthicated , userRole ,(req, res) => {
    const { memberId } = req.params;

    // SQL query to update the family member's status to 2 (soft delete)
    const query = `
        UPDATE familydetails
        SET status = 2
        WHERE memberId = ?;
    `;
    const values = [memberId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Family member not found', status: "false" });
        }

        // Successfully soft deleted the family member
        res.status(200).json({ message: 'Family member deleted successfully', status: "true" });
    });
});


// API for fetching family members by parentId
router.get('/getfamilymembers/:parentId',IsUserAuthicated ,  (req, res) => {
    const { parentId } = req.params;

    // Validate parentId
    if (!parentId) {
        return res.status(400).json({ error: 'parentId is required' });
    }

    // SQL query to fetch family members by parentId
    const query = `
        SELECT u.userId, u.firstName, u.lastName, u.dateOfBirth, u.age, u.gender, u.bloodGroup, u.education, u.address, 
            u.status, u.createdDate, u.updatedDate, u.email, u.userType, u.contactNumber, u.photo,
            c.name AS countryName, s.name AS stateName, ct.name AS cityName
        FROM user u
        LEFT JOIN country c ON u.countryId = c.countryId
        LEFT JOIN state s ON u.stateId = s.stateId
        LEFT JOIN city ct ON u.cityId = ct.cityId
        WHERE u.parentId = ?
    `;

    dbConfig.query(query, [parentId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Successfully fetched family members
        res.status(200).json({ familyMembers: results });
    });
});


// API to toggle the status of a family member
router.put('/togglefamilymemberstatus/:memberId', IsUserAuthicated , userRole ,(req, res) => {
    const { memberId } = req.params;

    // SQL query to fetch the current status of the family member
    const selectQuery = 'SELECT status FROM familydetails WHERE memberId = ?';
    const updateQuery = 'UPDATE familydetails SET status = ? WHERE memberId = ?';

    dbConfig.query(selectQuery, [memberId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if family member exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Family member not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, memberId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully toggled the family member status
            res.status(200).json({ message: 'Family member status updated successfully', status: "true" });
        });
    });
});


// API for family member details
router.get('/familymemberdetails',IsUserAuthicated , userRole , (req, res) => {
    const { memberId } = req.body;
    if (!memberId) {
        return res.status(400).json({ error: 'Please enter member ID', status: "false" });
    }
    const query = 'SELECT * FROM familydetails WHERE memberId = ?';

    dbConfig.query(query, [memberId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if family member exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Family member not found', status: "false" });
        }

        const familyMember = results[0];

        // Family member details retrieved successfully
        res.status(200).json({
            message: 'Family Member Details',
            status: "true",
            familyMember: {
                memberId: familyMember.memberId,
                firstName: familyMember.firstName,
                lastName: familyMember.lastName,
                contactNumber: familyMember.contactNumber,
                email: familyMember.email,
                age: familyMember.age,
                education: familyMember.education,
                address: familyMember.address,
                countryId: familyMember.countryId,
                stateId: familyMember.stateId,
                cityId: familyMember.cityId,
                createdDate: familyMember.createdDate,
                updatedDate: familyMember.updatedDate,
                userId: familyMember.userId
            }
        });
    });
});

module.exports = router;