const express = require('express');
const router = express.Router();
const fs = require('fs');
const { Parser } = require('json2csv');
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig"); // Adjust path as per your configuration


// Endpoint to export all users as CSV
router.get('/exportuserscsv', async (req, res) => {
    try {
        // Get current timestamp in Indian Standard Time (IST)
        const timestamp = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');

        // Query to fetch all users with country, state, and city names from the database
        const query = `
            SELECT 
                u.userId, u.firstName, u.lastName, u.contactNumber,u.dateOfBirth, u.email, u.age, u.education, u.address, 
                c.name AS country, s.name AS state, ct.name AS city, u.userType
            FROM 
                user u
            JOIN 
                country c ON u.countryId = c.countryId
            JOIN 
                state s ON u.stateId = s.stateId
            JOIN 
                city ct ON u.cityId = ct.cityId
        `;

        // Execute query using dbConfig
        dbConfig.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching users:', err);
                return res.status(500).json({ error: 'Failed to fetch users from database', status: 'false' });
            }

            // If no users found
            if (results.length === 0) {
                return res.status(404).json({ message: 'No users found', status: 'false' });
            }

            // Convert JSON data to CSV format
            const json2csvParser = new Parser({ header: true });
            const csvData = json2csvParser.parse(results);

            // CSV file path and name
            const csvFilePath = `./exported_users_${timestamp}.csv`;

            // Write CSV data to file
            fs.writeFileSync(csvFilePath, csvData, 'utf-8');

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.download(csvFilePath, `exported_users_${timestamp}.csv`, (err) => {
                if (err) {
                    console.error('Error downloading CSV file:', err);
                    return res.status(500).json({ error: 'Failed to download CSV file', status: 'false' });
                }

                // Delete CSV file after download
                fs.unlinkSync(csvFilePath);
            });
        });
    } catch (error) {
        console.error('Error exporting users as CSV:', error);
        res.status(500).json({ error: 'Failed to export users as CSV', status: 'false' });
    }
});

// // Endpoint to export all users as CSV
// router.get('/exportuserscsv', async (req, res) => {
//     try {
//         // Get current timestamp in Indian Standard Time (IST)
//         const timestamp = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');

//         // Query to fetch all users from the database
//         const query = `
//             SELECT * FROM user
//         `;

//         // Execute query using dbConfig
//         dbConfig.query(query, (err, results) => {
//             if (err) {
//                 console.error('Error fetching users:', err);
//                 return res.status(500).json({ error: 'Failed to fetch users from database', status: 'false' });
//             }

//             // If no users found
//             if (results.length === 0) {
//                 return res.status(404).json({ message: 'No users found', status: 'false' });
//             }

//             // Convert JSON data to CSV format
//             const json2csvParser = new Parser({ header: true });
//             const csvData = json2csvParser.parse(results);

//             // CSV file path and name
//             const csvFilePath = `./exported_users_${timestamp}.csv`;

//             // Write CSV data to file
//             fs.writeFileSync(csvFilePath, csvData, 'utf-8');

//             // Set response headers for CSV download
//             res.setHeader('Content-Type', 'text/csv');
//             res.download(csvFilePath, `exported_users_${timestamp}.csv`, (err) => {
//                 if (err) {
//                     console.error('Error downloading CSV file:', err);
//                     return res.status(500).json({ error: 'Failed to download CSV file', status: 'false' });
//                 }

//                 // Delete CSV file after download
//                 fs.unlinkSync(csvFilePath);
//             });
//         });
//     } catch (error) {
//         console.error('Error exporting users as CSV:', error);
//         res.status(500).json({ error: 'Failed to export users as CSV', status: 'false' });
//     }
// });

// Endpoint to export all events as CSV
router.get('/exporteventscsv', async (req, res) => {
    try {
        // Get current timestamp in Indian Standard Time (IST)
        const timestamp = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');

        // Query to fetch all events from the database
        const query = `
            SELECT eventId, name, type, dateTime, description, status, photo FROM events
        `;

        // Execute query using dbConfig
        dbConfig.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching events:', err);
                return res.status(500).json({ error: 'Failed to fetch events from database', status: 'false' });
            }

            // If no events found
            if (results.length === 0) {
                return res.status(404).json({ message: 'No events found', status: 'false' });
            }

            // Convert JSON data to CSV format
            const json2csvParser = new Parser({ header: true });
            const csvData = json2csvParser.parse(results);

            // CSV file path and name
            const csvFilePath = `./exported_events_${timestamp}.csv`;

            // Write CSV data to file
            fs.writeFileSync(csvFilePath, csvData, 'utf-8');

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.download(csvFilePath, `exported_events_${timestamp}.csv`, (err) => {
                if (err) {
                    console.error('Error downloading CSV file:', err);
                    return res.status(500).json({ error: 'Failed to download CSV file', status: 'false' });
                }

                // Delete CSV file after download
                fs.unlinkSync(csvFilePath);
            });
        });
    } catch (error) {
        console.error('Error exporting events as CSV:', error);
        res.status(500).json({ error: 'Failed to export events as CSV', status: 'false' });
    }
});

// Endpoint to export all family details as CSV
router.get('/exportfamilydetailscsv', async (req, res) => {
    try {
        // Get current timestamp in Indian Standard Time (IST)
        const timestamp = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');

        // Query to fetch all family details from the database
        const query = `
            SELECT * FROM familydetails
        `;

        // Execute query using dbConfig
        dbConfig.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching family details:', err);
                return res.status(500).json({ error: 'Failed to fetch family details from database', status: 'false' });
            }

            // If no family details found
            if (results.length === 0) {
                return res.status(404).json({ message: 'No family details found', status: 'false' });
            }

            // Convert JSON data to CSV format
            const json2csvParser = new Parser({ header: true });
            const csvData = json2csvParser.parse(results);

            // CSV file path and name
            const csvFilePath = `./exported_familydetails_${timestamp}.csv`;

            // Write CSV data to file
            fs.writeFileSync(csvFilePath, csvData, 'utf-8');

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.download(csvFilePath, `exported_familydetails_${timestamp}.csv`, (err) => {
                if (err) {
                    console.error('Error downloading CSV file:', err);
                    return res.status(500).json({ error: 'Failed to download CSV file', status: 'false' });
                }

                // Delete CSV file after download
                fs.unlinkSync(csvFilePath);
            });
        });
    } catch (error) {
        console.error('Error exporting family details as CSV:', error);
        res.status(500).json({ error: 'Failed to export family details as CSV', status: 'false' });
    }
});

// Endpoint to export all magazine details as CSV
router.get('/exportmagazinescsv', async (req, res) => {
    try {
        // Get current timestamp in Indian Standard Time (IST)
        const timestamp = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');

        // Query to fetch all magazine details from the database
        const query = `
            SELECT magazineId, title, description, date, magazine, status FROM magazine
        `;

        // Execute query using dbConfig
        dbConfig.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching magazine details:', err);
                return res.status(500).json({ error: 'Failed to fetch magazine details from database', status: 'false' });
            }

            // If no magazine details found
            if (results.length === 0) {
                return res.status(404).json({ message: 'No magazine details found', status: 'false' });
            }

            // Convert JSON data to CSV format
            const json2csvParser = new Parser({ header: true });
            const csvData = json2csvParser.parse(results);

            // CSV file path and name
            const csvFilePath = `./exported_magazines_${timestamp}.csv`;

            // Write CSV data to file
            fs.writeFileSync(csvFilePath, csvData, 'utf-8');

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.download(csvFilePath, `exported_magazines_${timestamp}.csv`, (err) => {
                if (err) {
                    console.error('Error downloading CSV file:', err);
                    return res.status(500).json({ error: 'Failed to download CSV file', status: 'false' });
                }

                // Delete CSV file after download
                fs.unlinkSync(csvFilePath);
            });
        });
    } catch (error) {
        console.error('Error exporting magazine details as CSV:', error);
        res.status(500).json({ error: 'Failed to export magazine details as CSV', status: 'false' });
    }
});


// Endpoint to export all matrimonialprofiles details as CSV
router.get('/exportmatrimonialprofilescsv', async (req, res) => {
    try {
        // Get current timestamp in Indian Standard Time (IST)
        const timestamp = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');

        // Query to fetch all matrimonialprofiles details from the database
        const query = `
            SELECT matrimonialId, firstName, middleName, lastName, contactNumber, dateOfBirth, age, profilePic, biodata, status FROM matrimonialprofiles
        `;

        // Execute query using dbConfig
        dbConfig.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching matrimonialprofiles details:', err);
                return res.status(500).json({ error: 'Failed to fetch matrimonialprofiles details from database', status: 'false' });
            }

            // If no matrimonialprofiles details found
            if (results.length === 0) {
                return res.status(404).json({ message: 'No matrimonialprofiles details found', status: 'false' });
            }

            // Convert JSON data to CSV format
            const json2csvParser = new Parser({ header: true });
            const csvData = json2csvParser.parse(results);

            // CSV file path and name
            const csvFilePath = `./exported_matrimonialprofiles_${timestamp}.csv`;

            // Write CSV data to file
            fs.writeFileSync(csvFilePath, csvData, 'utf-8');

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.download(csvFilePath, `exported_matrimonialprofiles_${timestamp}.csv`, (err) => {
                if (err) {
                    console.error('Error downloading CSV file:', err);
                    return res.status(500).json({ error: 'Failed to download CSV file', status: 'false' });
                }

                // Delete CSV file after download
                fs.unlinkSync(csvFilePath);
            });
        });
    } catch (error) {
        console.error('Error exporting matrimonialprofiles details as CSV:', error);
        res.status(500).json({ error: 'Failed to export matrimonialprofiles details as CSV', status: 'false' });
    }
});

// Endpoint to export all forum details as CSV
router.get('/exportforumscsv', async (req, res) => {
    try {
        // Get current timestamp in Indian Standard Time (IST)
        const timestamp = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');

        // Query to fetch all forum details from the database
        const query = `
            SELECT id, userId, forumCategoryId, title, description, status, photo FROM forums
        `;

        // Execute query using dbConfig
        dbConfig.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching forum details:', err);
                return res.status(500).json({ error: 'Failed to fetch forum details from database', status: 'false' });
            }

            // If no forum details found
            if (results.length === 0) {
                return res.status(404).json({ message: 'No forum details found', status: 'false' });
            }

            // Convert JSON data to CSV format
            const json2csvParser = new Parser({ header: true });
            const csvData = json2csvParser.parse(results);

            // CSV file path and name
            const csvFilePath = `./exported_forums_${timestamp}.csv`;

            // Write CSV data to file
            fs.writeFileSync(csvFilePath, csvData, 'utf-8');

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.download(csvFilePath, `exported_forums_${timestamp}.csv`, (err) => {
                if (err) {
                    console.error('Error downloading CSV file:', err);
                    return res.status(500).json({ error: 'Failed to download CSV file', status: 'false' });
                }

                // Delete CSV file after download
                fs.unlinkSync(csvFilePath);
            });
        });
    } catch (error) {
        console.error('Error exporting forum details as CSV:', error);
        res.status(500).json({ error: 'Failed to export forum details as CSV', status: 'false' });
    }
});


// Endpoint to export all business connection details as CSV
router.get('/exportbusinessconnectcsv', async (req, res) => {
    try {
        // Get current timestamp in Indian Standard Time (IST)
        const timestamp = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');

        // Query to fetch all business connection details from the database
        const query = `
             SELECT 
                b.businessId, b.userId, b.businessType, b.businessTitle, b.contactNumber, b.address, 
                c.name AS countryName, s.name AS stateName, ci.name AS cityName, b.status, b.photo
            FROM businessconnect b
            LEFT JOIN country c ON b.countryId = c.countryId
            LEFT JOIN state s ON b.stateId = s.stateId
            LEFT JOIN city ci ON b.cityId = ci.cityId
        `;

        // Execute query using dbConfig
        dbConfig.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching business connection details:', err);
                return res.status(500).json({ error: 'Failed to fetch business connection details from database', status: 'false' });
            }

            // If no business connection details found
            if (results.length === 0) {
                return res.status(404).json({ message: 'No business connection details found', status: 'false' });
            }

            // Convert JSON data to CSV format
            const json2csvParser = new Parser({ header: true });
            const csvData = json2csvParser.parse(results);

            // CSV file path and name
            const csvFilePath = `./exported_businessconnect_${timestamp}.csv`;

            // Write CSV data to file
            fs.writeFileSync(csvFilePath, csvData, 'utf-8');

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.download(csvFilePath, `exported_businessconnect_${timestamp}.csv`, (err) => {
                if (err) {
                    console.error('Error downloading CSV file:', err);
                    return res.status(500).json({ error: 'Failed to download CSV file', status: 'false' });
                }

                // Delete CSV file after download
                fs.unlinkSync(csvFilePath);
            });
        });
    } catch (error) {
        console.error('Error exporting business connection details as CSV:', error);
        res.status(500).json({ error: 'Failed to export business connection details as CSV', status: 'false' });
    }
});

// Endpoint to export all announcements as CSV
router.get('/exportannouncementscsv', async (req, res) => {
    try {
        // Get current timestamp in Indian Standard Time (IST)
        const timestamp = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');

        // Query to fetch all announcements from the database
        const query = `
            SELECT announcementId, announcementTitle, announcementType, announcementDateTime, announcementDescription, status FROM announcements
        `;

        // Execute query using dbConfig
        dbConfig.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching announcements:', err);
                return res.status(500).json({ error: 'Failed to fetch announcements from database', status: 'false' });
            }

            // If no announcements found
            if (results.length === 0) {
                return res.status(404).json({ message: 'No announcements found', status: 'false' });
            }

            // Convert JSON data to CSV format
            const json2csvParser = new Parser({ header: true });
            const csvData = json2csvParser.parse(results);

            // CSV file path and name
            const csvFilePath = `./exported_announcements_${timestamp}.csv`;

            // Write CSV data to file
            fs.writeFileSync(csvFilePath, csvData, 'utf-8');

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.download(csvFilePath, `exported_announcements_${timestamp}.csv`, (err) => {
                if (err) {
                    console.error('Error downloading CSV file:', err);
                    return res.status(500).json({ error: 'Failed to download CSV file', status: 'false' });
                }

                // Delete CSV file after download
                fs.unlinkSync(csvFilePath);
            });
        });
    } catch (error) {
        console.error('Error exporting announcements as CSV:', error);
        res.status(500).json({ error: 'Failed to export announcements as CSV', status: 'false' });
    }
});

// Endpoint to export all ads as CSV
router.get('/exportadscsv', async (req, res) => {
    try {
        // Get current timestamp in Indian Standard Time (IST)
        const timestamp = moment().tz('Asia/Kolkata').format('YYYYMMDD_HHmmss');

        // Query to fetch all ads from the database
        const query = `
            SELECT adsId, title, type, status, photo FROM ads
        `;

        // Execute query using dbConfig
        dbConfig.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching ads:', err);
                return res.status(500).json({ error: 'Failed to fetch ads from database', status: 'false' });
            }

            // If no ads found
            if (results.length === 0) {
                return res.status(404).json({ message: 'No ads found', status: 'false' });
            }

            // Convert JSON data to CSV format
            const json2csvParser = new Parser({ header: true });
            const csvData = json2csvParser.parse(results);

            // CSV file path and name
            const csvFilePath = `./exported_ads_${timestamp}.csv`;

            // Write CSV data to file
            fs.writeFileSync(csvFilePath, csvData, 'utf-8');

            // Set response headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.download(csvFilePath, `exported_ads_${timestamp}.csv`, (err) => {
                if (err) {
                    console.error('Error downloading CSV file:', err);
                    return res.status(500).json({ error: 'Failed to download CSV file', status: 'false' });
                }

                // Delete CSV file after download
                fs.unlinkSync(csvFilePath);
            });
        });
    } catch (error) {
        console.error('Error exporting ads as CSV:', error);
        res.status(500).json({ error: 'Failed to export ads as CSV', status: 'false' });
    }
});

module.exports = router;
