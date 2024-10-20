const express = require('express');
const moment = require('moment-timezone');
const router = express.Router();
const dbConfig = require("./dbconfig");
const http = require('http');
require('dotenv').config();

// MsgClub API credentials
const API_KEY = process.env.MSGCLUB_AUTH_KEY; // Replace with your MsgClub API key
const SENDER_ID = process.env.MSGCLUB_SENDER_ID; // Replace with your sender ID

const formatPhoneNumber = (number) => {
    if (!number.startsWith('+')) {
        return number;
    }
    return number;
};

const sendOtpWithMsgClub = (otp, contactNumber) => {
    return new Promise((resolve, reject) => {
        const encodedContactNumber = encodeURIComponent(contactNumber);
        const MESSAGE = `OTP for Community Application login is: ${otp}. Please use this OTP to complete your verification process. Thanks, Aasma Technology Solutions`; // The message you want to send

        // URL encoding the message
        const encodedMessage = encodeURIComponent(MESSAGE);

        // Construct the path
        var path = `/rest/services/sendSMS/sendGroupSms?AUTH_KEY=${API_KEY}&senderId=${SENDER_ID}&message=${encodedMessage}&routeId=8&mobileNos=${encodedContactNumber}`;

        var options = {
            "method": "GET",
            "hostname": "msg.msgclub.net",
            "path": path,
            "headers": {
                "Cache-Control": "no-cache"
            }
        };

        const req = http.request(options, (res) => {
            let chunks = [];

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                const body = Buffer.concat(chunks).toString();
                if (res.statusCode === 200) {
                    resolve(body);
                } else {
                    reject(new Error(`Failed to send OTP: ${body}`));
                }
            });
        });

        req.on('error', (e) => {
            console.error('Request error:', e);
            reject(e);
        });

        req.end();
    });
};


router.post('/authentication', async (req, res) => {
    const { contactNumber } = req.body;

    if (!contactNumber) {
        return res.status(400).json({ error: 'Please enter a contact number', status: "false" });
    }

    const formattedContactNumber = formatPhoneNumber(contactNumber);
    const query = 'SELECT 1 FROM user WHERE contactNumber = ? LIMIT 1';

    dbConfig.query(query, [contactNumber], async (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ error: `Database query error: ${err.message}`, status: "false" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        let digits = "0123456789";
        let OTP = "";
        for (let i = 0; i < 4; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
        }
        // OTP = 4567; // For testing purposes
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

        try {
            // Send OTP using MsgClub API
            const response = await sendOtpWithMsgClub(OTP, formattedContactNumber);
            console.log('MsgClub API response:', response);

            // Store OTP and expiry in the database
            const updateQuery = 'UPDATE user SET otp = ?, otp_expiry = ? WHERE contactNumber = ?';
            dbConfig.query(updateQuery, [OTP, otpExpiry, contactNumber], (err, results) => {
                if (err) {
                    console.error('Database update error:', err);
                    return res.status(500).json({ error: `Failed to store OTP: ${err.message}`, status: "false" });
                }
                res.status(200).json({ message: "OTP sent and stored successfully", status: "true" });
            });
        } catch (e) {
            console.error('Error sending OTP:', e.message);
            res.status(500).json({ error: `Failed to send OTP: ${e.message}`, status: "false" });
        }
    });
});

const jwt = require('jsonwebtoken'); // Import jwt



// Endpoint to verify OTP and generate JWT
router.post('/verify-otp', (req, res) => {
    const { contactNumber, otp } = req.body;

    if (!contactNumber || !otp) {
        return res.status(400).json({ error: 'Please enter contact number and OTP', status: "false" });
    }

    const query = `
    SELECT 
        user.*, 
        country.name AS countryName, 
        state.name AS stateName, 
        city.name AS cityName
    FROM user
    LEFT JOIN country ON user.countryId = country.countryId
    LEFT JOIN state ON user.stateId = state.stateId
    LEFT JOIN city ON user.cityId = city.cityId
    WHERE user.contactNumber = ?
    LIMIT 1
    `;

    dbConfig.query(query, [contactNumber], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        const user = results[0];
        const currentDateTime = new Date();

        // Check if OTP matches
        if (user.otp != otp) {
            return res.status(400).json({ error: 'Invalid OTP', status: "false" });
        }

        // Check if OTP is expired
        if (currentDateTime > user.otp_expiry) {
            return res.status(400).json({ error: 'OTP expired', status: "false" });
        }

        // OTP is valid, generate JWT token
    const token = jwt.sign(
        { userId: user.userId, email: user.email }, // Payload now includes email and userId
        process.env.ACCESS_TOKEN_SECRET
    );

        // Use INSERT ... ON DUPLICATE KEY UPDATE to handle token creation or update
        const insertOrUpdateTokenQuery = `
            INSERT INTO token (userId, token) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE token = ?`;
        dbConfig.query(insertOrUpdateTokenQuery, [user.userId, token, token], (err, tokenResult) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to store token', status: "false" });
            }
            console.log('Token stored successfully:', token);

            // Send user data and token in response
            return res.status(200).json({
                message: 'Authentication successful',
                status: "true",
                token,
                user: {
                    userId: user.userId,
                    parentId: user.parentId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    contactNumber: user.contactNumber,
                    email: user.email,
                    age: user.age,
                    gender: user.gender,
                    bloodGroup: user.bloodGroup,
                    education: user.education,
                    address: user.address,
                    countryId: user.countryId,
                    stateId: user.stateId,
                    cityId: user.cityId,
                    createdDate: user.createdDate,
                    updatedDate: user.updatedDate,
                    userType: user.userType,
                    photo: user.photo,
                    dateOfBirth: user.dateOfBirth,
                    countryName: user.countryName,
                    stateName: user.stateName,
                    cityName: user.cityName
                }
            });
        });
    });
});

module.exports = router;

