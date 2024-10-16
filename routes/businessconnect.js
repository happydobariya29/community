// const express = require('express');
// const router = express.Router();
// const moment = require('moment-timezone');
// const dbConfig = require("./dbconfig");
// const app = express();

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


// router.post('/addbusiness', (req, res) => {
//     const { userId, businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, description, email, website } = req.body;

//     // Validate inputs
//     if (!userId || !businessType || !businessTitle || !contactNumber || !address || !countryId || !stateId || !cityId || !description || !email) {
//         console.log("Validation failed: Required fields are missing");
//         return res.status(400).json({ error: 'Required fields are missing', status: "false" });
//     }

//     // Get current timestamp in Indian Standard Time (IST)
//     const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
//     const updatedDate = createdDate; // Initialize updatedDate with the same value as createdDate

//     // SQL query to insert a new business connection with the new fields
//     const query = `
//         INSERT INTO businessconnect
//         (userId, businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, description, email, website, createdDate, updatedDate)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;
//     const values = [userId, businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, description, email, website, createdDate, updatedDate];

//     dbConfig.query(query, values, (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }

//         // Successfully added new business connection
//         res.status(201).json({ message: 'Business connection added successfully', status: "true", businessId: results.insertId });
//     });
// });

const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const multer = require('multer');
const path = require('path');

// Configure multer for file storage
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
    limits: { fileSize: 10000000 }, // 10MB file size limit
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
}).single('photo');  // Handling only one photo

// API for adding a new business
router.post('/addbusiness', upload, (req, res) => {
    const { userId, businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, description, email, website } = req.body;
    const photo = req.file ? `uploads/${req.file.filename}` : null;

    // Validate required fields
    if (!userId || !businessType || !businessTitle || !contactNumber || !address || !countryId || !stateId || !cityId || !description || !email) {
        return res.status(400).json({ error: 'Required fields are missing', status: "false" });
    }

    // Validate if userId exists in the user table
    dbConfig.query('SELECT userId FROM user WHERE userId = ?', [userId], (err, userResults) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ error: 'Invalid userId', status: "false" });
        }

        // Get current timestamp in Indian Standard Time (IST)
        const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        const updatedDate = createdDate;

        // SQL query to insert a new business with photo and createdDate
        const query = `
            INSERT INTO businessconnect
            (userId, businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, description, email, website, photo, createdDate, updatedDate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [userId, businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, description, email, website, photo, createdDate, updatedDate];

        dbConfig.query(query, values, (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully added the new business
            res.status(201).json({ message: 'Business connection added successfully', status: "true", businessId: results.insertId });
        });
    });
});


// // API for business connection details
// router.get('/businessdetails', (req, res) => {
//     const { businessId } = req.query;
//     if (!businessId) {
//         return res.status(400).json({ error: 'Please enter business ID', status: "false" });
//     }

//     // SQL query to fetch business details including the new fields
//     const query = 'SELECT * FROM businessconnect WHERE businessId = ?';

//     dbConfig.query(query, [businessId], (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }

//         // Check if business connection exists
//         if (results.length === 0) {
//             return res.status(404).json({ error: 'Business connection not found', status: "false" });
//         }

//         const business = results[0];

//         // Business connection found successfully
//         res.status(200).json({
//             message: 'Business Connection Details',
//             status: "true",
//             business: {
//                 businessId: business.businessId,
//                 userId: business.userId,
//                 businessType: business.businessType,
//                 businessTitle: business.businessTitle,
//                 contactNumber: business.contactNumber,
//                 address: business.address,
//                 countryId: business.countryId,
//                 stateId: business.stateId,
//                 cityId: business.cityId,
//                 description: business.description,  // Added field
//                 email: business.email,  // Added field
//                 website: business.website,  // Added field
//                 status: business.status,
//                 photo: business.photo,
//                 createdDate: business.createdDate,
//                 updatedDate: business.updatedDate
//             }
//         });
//     });
// });

// // API for business connection details
// router.get('/businessdetails', (req, res) => {
//     const { businessId } = req.query;
//     if (!businessId) {
//         return res.status(400).json({ error: 'Please enter business ID', status: "false" });
//     }

//     // SQL query to fetch business details including user information
//     const query = `
//         SELECT 
//             b.businessId, 
//             b.userId, 
//             b.businessType, 
//             b.businessTitle, 
//             b.contactNumber, 
//             b.address, 
//             b.countryId, 
//             b.stateId, 
//             b.cityId, 
//             b.description, 
//             b.email, 
//             b.website, 
//             b.status, 
//             b.photo, 
//             b.createdDate, 
//             b.updatedDate,
//             CONCAT(u.firstName, ' ', u.lastName) AS userName  -- Fetching userName by combining firstName and lastName
//         FROM 
//             businessconnect b
//         LEFT JOIN 
//             user u ON b.userId = u.userId  -- Joining user table based on userId
//         WHERE 
//             b.businessId = ?;
//     `;

//     dbConfig.query(query, [businessId], (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }

//         // Check if business connection exists
//         if (results.length === 0) {
//             return res.status(404).json({ error: 'Business connection not found', status: "false" });
//         }

//         const business = results[0];

//         // Business connection found successfully
//         res.status(200).json({
//             message: 'Business Connection Details',
//             status: "true",
//             business: {
//                 businessId: business.businessId,
//                 userId: business.userId,
//                 businessType: business.businessType,
//                 businessTitle: business.businessTitle,
//                 contactNumber: business.contactNumber,
//                 address: business.address,
//                 countryId: business.countryId,
//                 stateId: business.stateId,
//                 cityId: business.cityId,
//                 description: business.description,
//                 email: business.email,
//                 website: business.website,
//                 status: business.status,
//                 photo: business.photo,
//                 createdDate: business.createdDate,
//                 updatedDate: business.updatedDate,
//                 userName: business.userName,  // Added userName to the response
//             }
//         });
//     });
// });

// API for business connection details
router.get('/businessdetails', (req, res) => {
    const { businessId } = req.query;
    if (!businessId) {
        return res.status(400).json({ error: 'Please enter business ID', status: "false" });
    }

    // SQL query to fetch business details including country, state, city, and user information
    const query = `
        SELECT 
            b.businessId, 
            b.userId, 
            CONCAT(u.firstName, ' ', u.lastName) AS username,  -- Fetching userName by combining firstName and lastName
            b.businessType, 
            b.businessTitle, 
            b.contactNumber, 
            b.address, 
            b.countryId, 
            c.name AS countryName,   -- Join for countryName
            b.stateId, 
            s.name AS stateName,     -- Join for stateName
            b.cityId, 
            ci.name AS cityName,     -- Join for cityName
            b.description, 
            b.email, 
            b.website, 
            b.status, 
            b.photo, 
            b.createdDate, 
            b.updatedDate
        FROM 
            businessconnect b
        LEFT JOIN 
            user u ON b.userId = u.userId       -- Joining user table based on userId
        LEFT JOIN 
            country c ON b.countryId = c.countryId  -- Joining country table for countryName
        LEFT JOIN 
            state s ON b.stateId = s.stateId        -- Joining state table for stateName
        LEFT JOIN 
            city ci ON b.cityId = ci.cityId         -- Joining city table for cityName
        WHERE 
            b.businessId = ?;
    `;

    dbConfig.query(query, [businessId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if business connection exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Business connection not found', status: "false" });
        }

        const business = results[0];

        // Business connection found successfully
        res.status(200).json({
            message: 'Business Connection Details',
            status: "true",
            business: {
                businessId: business.businessId,
                userId: business.userId,
                username: business.username,          // User's full name
                businessType: business.businessType,
                businessTitle: business.businessTitle,
                contactNumber: business.contactNumber,
                address: business.address,
                countryId: business.countryId,
                countryName: business.countryName,    // Country name
                stateId: business.stateId,
                stateName: business.stateName,        // State name
                cityId: business.cityId,
                cityName: business.cityName,          // City name
                description: business.description,
                email: business.email,
                website: business.website,
                status: business.status,
                photo: business.photo,
                createdDate: business.createdDate,
                updatedDate: business.updatedDate
            }
        });
    });
});


// // API for fetching all business details associated with a userId
// router.get('/business_details', (req, res) => {
//     const { userId } = req.query; // Get userId from query parameters
//     if (!userId) {
//         return res.status(400).json({ error: 'Please enter user ID', status: "false" });
//     }

//     // SQL query to fetch all business details for the given userId
//     const query = `
//         SELECT 
//             b.businessId, 
//             b.userId, 
//             b.businessType, 
//             b.businessTitle, 
//             b.contactNumber, 
//             b.address, 
//             b.countryId, 
//             b.stateId, 
//             b.cityId, 
//             b.description, 
//             b.email, 
//             b.website, 
//             b.status, 
//             b.photo, 
//             b.createdDate, 
//             b.updatedDate,
//             CONCAT(u.firstName, ' ', u.lastName) AS userName  -- Fetching userName by combining firstName and lastName
//         FROM 
//             businessconnect b
//         LEFT JOIN 
//             user u ON b.userId = u.userId  -- Joining user table based on userId
//         WHERE 
//             b.userId = ?;  -- Filter by userId
//     `;

//     dbConfig.query(query, [userId], (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }

//         // Check if any businesses are found for the user
//         if (results.length === 0) {
//             return res.status(404).json({ error: 'No businesses found for this user', status: "false" });
//         }

//         // Return all businesses found for the user
//         res.status(200).json({
//             message: 'Business Connection Details',
//             status: "true",
//             businesses: results.map(business => ({
//                 businessId: business.businessId,
//                 userId: business.userId,
//                 businessType: business.businessType,
//                 businessTitle: business.businessTitle,
//                 contactNumber: business.contactNumber,
//                 address: business.address,
//                 countryId: business.countryId,
//                 stateId: business.stateId,
//                 cityId: business.cityId,
//                 description: business.description,
//                 email: business.email,
//                 website: business.website,
//                 status: business.status,
//                 photo: business.photo,
//                 createdDate: business.createdDate,
//                 updatedDate: business.updatedDate,
//                 userName: business.userName  // Added userName to each business record
//             }))
//         });
//     });
// });

// // API for fetching all business details associated with a userId
// router.get('/business_details', (req, res) => {
//     const { userId } = req.query; // Get userId from query parameters
//     if (!userId) {
//         return res.status(400).json({ error: 'Please enter user ID', status: "false" });
//     }

//     // SQL query to fetch all business details for the given userId, including country, state, and city names
//     const query = `
//         SELECT 
//             b.businessId, 
//             b.userId, 
//             CONCAT(u.firstName, ' ', u.lastName) AS userName,  -- Fetching userName by combining firstName and lastName
//             b.businessType, 
//             b.businessTitle, 
//             b.contactNumber, 
//             b.address, 
//             b.countryId, 
//             c.name AS countryName,   -- Join for countryName
//             b.stateId, 
//             s.name AS stateName,     -- Join for stateName
//             b.cityId, 
//             ci.name AS cityName,     -- Join for cityName
//             b.description, 
//             b.email, 
//             b.website, 
//             b.status, 
//             b.photo, 
//             b.createdDate, 
//             b.updatedDate
//         FROM 
//             businessconnect b
//         LEFT JOIN 
//             user u ON b.userId = u.userId         -- Joining user table based on userId
//         LEFT JOIN 
//             country c ON b.countryId = c.countryId  -- Joining country table for countryName
//         LEFT JOIN 
//             state s ON b.stateId = s.stateId        -- Joining state table for stateName
//         LEFT JOIN 
//             city ci ON b.cityId = ci.cityId         -- Joining city table for cityName
//         WHERE 
//             b.userId = ?;  -- Filter by userId
//     `;

//     dbConfig.query(query, [userId], (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }

//         // Check if any businesses are found for the user
//         if (results.length === 0) {
//             return res.status(404).json({ error: 'No businesses found for this user', status: "false" });
//         }

//         // Return all businesses found for the user
//         res.status(200).json({
//             message: 'Business Connection Details',
//             status: "true",
//             businesses: results.map(business => ({
//                 businessId: business.businessId,
//                 userId: business.userId,
//                 userName: business.userName,            // Added userName to each business record
//                 businessType: business.businessType,
//                 businessTitle: business.businessTitle,
//                 contactNumber: business.contactNumber,
//                 address: business.address,
//                 countryId: business.countryId,
//                 countryName: business.countryName,      // Added countryName
//                 stateId: business.stateId,
//                 stateName: business.stateName,          // Added stateName
//                 cityId: business.cityId,
//                 cityName: business.cityName,            // Added cityName
//                 description: business.description,
//                 email: business.email,
//                 website: business.website,
//                 status: business.status,
//                 photo: business.photo,
//                 createdDate: business.createdDate,
//                 updatedDate: business.updatedDate
//             }))
//         });
//     });
// });

// // API for fetching all business details associated with a userId, with search functionality
// router.get('/business_details', (req, res) => {
//     const { userId, search = '' } = req.query; // Get userId and search from query parameters

//     if (!userId) {
//         return res.status(400).json({ error: 'Please enter user ID', status: "false" });
//     }

//     // SQL query to fetch all business details for the given userId or search, including country, state, and city names
//     let query = `
//         SELECT 
//             b.businessId, 
//             b.userId, 
//             CONCAT(u.firstName, ' ', u.lastName) AS username,  -- Fetching userName by combining firstName and lastName
//             b.businessType, 
//             b.businessTitle, 
//             b.contactNumber, 
//             b.address, 
//             b.countryId, 
//             c.name AS countryName,   -- Join for countryName
//             b.stateId, 
//             s.name AS stateName,     -- Join for stateName
//             b.cityId, 
//             ci.name AS cityName,     -- Join for cityName
//             b.description, 
//             b.email, 
//             b.website, 
//             b.status, 
//             b.photo, 
//             b.createdDate, 
//             b.updatedDate
//         FROM 
//             businessconnect b
//         LEFT JOIN 
//             user u ON b.userId = u.userId         -- Joining user table based on userId
//         LEFT JOIN 
//             country c ON b.countryId = c.countryId  -- Joining country table for countryName
//         LEFT JOIN 
//             state s ON b.stateId = s.stateId        -- Joining state table for stateName
//         LEFT JOIN 
//             city ci ON b.cityId = ci.cityId         -- Joining city table for cityName
//         WHERE 
//             b.status != 2
//             ${userId ? 'AND b.userId = ?' : ''}
//             ${search ? 'AND (b.businessTitle LIKE ? OR b.description LIKE ?)' : ''}
//             ORDER BY b.businessId DESC
//     `;

//     // Query parameters
//     let queryValues = [];
//     if (userId) {
//         queryValues.push(userId);
//     }
//     if (search) {
//         queryValues.push(`%${search}%`, `%${search}%`);
//     }

//     // Execute the query to fetch business details
//     dbConfig.query(query, queryValues, (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }

//         // Check if any businesses are found for the user
//         if (results.length === 0) {
//             return res.status(200).json({ error: 'No businesses found for this userId', status: "false" });
//         }

//         // Return all businesses found for the user
//         res.status(200).json({
//             message: 'Business Connection Details',
//             status: "true",
//             businesses: results.map(business => ({
//                 businessId: business.businessId,
//                 userId: business.userId,
//                 username: business.username,            // Added userName to each business record
//                 businessType: business.businessType,
//                 businessTitle: business.businessTitle,
//                 contactNumber: business.contactNumber,
//                 address: business.address,
//                 countryId: business.countryId,
//                 countryName: business.countryName,      // Added countryName
//                 stateId: business.stateId,
//                 stateName: business.stateName,          // Added stateName
//                 cityId: business.cityId,
//                 cityName: business.cityName,            // Added cityName
//                 description: business.description,
//                 email: business.email,
//                 website: business.website,
//                 status: business.status,
//                 photo: business.photo,
//                 createdDate: business.createdDate,
//                 updatedDate: business.updatedDate
//             }))
//         });
//     });
// });


// API for fetching all business details associated with a userId, with search and city filtering functionality
router.get('/business_details', (req, res) => {
    const { userId, search = '', cityIds = '' } = req.query; // Get userId, search, and cityIds from query parameters

    if (!userId) {
        return res.status(400).json({ error: 'Please enter user ID', status: "false" });
    }

    // Convert cityIds to an array if it's a string
    const cityIdArray = Array.isArray(cityIds) ? cityIds : cityIds.split(',').map(id => id.trim()).filter(id => id);

    // SQL query to fetch all business details for the given userId or search, including country, state, and city names
    let query = `
        SELECT 
            b.businessId, 
            b.userId, 
            CONCAT(u.firstName, ' ', u.lastName) AS username,  -- Fetching userName by combining firstName and lastName
            b.businessType, 
            b.businessTitle, 
            b.contactNumber, 
            b.address, 
            b.countryId, 
            c.name AS countryName,   -- Join for countryName
            b.stateId, 
            s.name AS stateName,     -- Join for stateName
            b.cityId, 
            ci.name AS cityName,     -- Join for cityName
            b.description, 
            b.email, 
            b.website, 
            b.status, 
            b.photo, 
            b.createdDate, 
            b.updatedDate
        FROM 
            businessconnect b
        LEFT JOIN 
            user u ON b.userId = u.userId         -- Joining user table based on userId
        LEFT JOIN 
            country c ON b.countryId = c.countryId  -- Joining country table for countryName
        LEFT JOIN 
            state s ON b.stateId = s.stateId        -- Joining state table for stateName
        LEFT JOIN 
            city ci ON b.cityId = ci.cityId         -- Joining city table for cityName
        WHERE 
            b.status != 2
            ${userId ? 'AND b.userId = ?' : ''}
            ${search ? 'AND (b.businessTitle LIKE ? OR b.description LIKE ?)' : ''}
            ${cityIdArray.length ? `AND b.cityId IN (${cityIdArray.map(() => '?').join(', ')})` : ''}
        ORDER BY b.businessId DESC
    `;

    // Query parameters
    let queryValues = [];
    if (userId) {
        queryValues.push(userId);
    }
    if (search) {
        queryValues.push(`%${search}%`, `%${search}%`);
    }
    if (cityIdArray.length) {
        queryValues.push(...cityIdArray);
    }

    // Execute the query to fetch business details
    dbConfig.query(query, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any businesses are found for the user
        if (results.length === 0) {
            return res.status(200).json({ error: 'No businesses found for this userId', status: "false" });
        }

        // Return all businesses found for the user with city filtering applied
        res.status(200).json({
            message: 'Business Connection Details',
            status: "true",
            businesses: results.map(business => ({
                businessId: business.businessId,
                userId: business.userId,
                username: business.username,            // Added userName to each business record
                businessType: business.businessType,
                businessTitle: business.businessTitle,
                contactNumber: business.contactNumber,
                address: business.address,
                countryId: business.countryId,
                countryName: business.countryName,      // Added countryName
                stateId: business.stateId,
                stateName: business.stateName,          // Added stateName
                cityId: business.cityId,
                cityName: business.cityName,            // Added cityName
                description: business.description,
                email: business.email,
                website: business.website,
                status: business.status,
                photo: business.photo,
                createdDate: business.createdDate,
                updatedDate: business.updatedDate
            }))
        });
    });
});



// Endpoint to soft delete a business connection
router.put('/deletebusiness/:businessId', (req, res) => {
    const { businessId } = req.params;

    // SQL query to update the business connection's status to 2 (soft delete)
    const query = `
        UPDATE businessconnect
        SET status = 2
        WHERE businessId = ?;
    `;
    const values = [businessId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Business connection not found', status: "false" });
        }

        // Successfully soft deleted the business connection
        res.status(200).json({ message: 'Business connection deleted successfully', status: "true" });
    });
});


// // Endpoint to update an existing business connection's details
// router.put('/editbusiness/:businessId', (req, res) => {
//     const { businessId } = req.params;
//     const { businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, description, email, website } = req.body;

//     // Validate required inputs
//     if (!businessType || !businessTitle || !contactNumber || !address || !countryId || !stateId || !cityId || !description || !email) {
//         return res.status(400).json({ error: 'All required fields are missing', status: "false" });
//     }

//     // Format current timestamp for IST (Indian Standard Time)
//     const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

//     // SQL query to update a business connection's details including updatedDate and optional website field
//     const updateQuery = `
//         UPDATE businessconnect
//         SET businessType = ?, businessTitle = ?, contactNumber = ?, address = ?, countryId = ?, stateId = ?, cityId = ?, 
//             description = ?, email = ?, website = ?, updatedDate = ?
//         WHERE businessId = ?;
//     `;
    
//     const values = [businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, description, email, website || null, indianDateTime, businessId];

//     dbConfig.query(updateQuery, values, (err, updateResults) => {
//         if (err) {
//             if (err.code === 'ER_DUP_ENTRY') {
//                 return res.status(400).json({ error: 'A business connection with these details already exists', status: "false" });
//             }
//             return res.status(500).json({ error: err.message, status: "false" });
//         }

//         // Check if any row was affected
//         if (updateResults.affectedRows === 0) {
//             return res.status(404).json({ error: 'Business connection not found', status: "false" });
//         }

//         // Fetch the updated business connection details
//         const fetchQuery = 'SELECT * FROM businessconnect WHERE businessId = ?';
//         dbConfig.query(fetchQuery, [businessId], (err, fetchResults) => {
//             if (err) {
//                 return res.status(500).json({ error: err.message, status: "false" });
//             }

//             if (fetchResults.length === 0) {
//                 return res.status(404).json({ error: 'Business connection not found', status: "false" });
//             }

//             const updatedBusiness = fetchResults[0];

//             // Successfully updated the business connection
//             res.status(200).json({ message: 'Business connection updated successfully', status: "true", business: updatedBusiness });
//         });
//     });
// });

// API for editing a business
router.put('/editbusiness/:businessId', upload, (req, res) => {
    const { businessId } = req.params;
    const { businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, description, email, website } = req.body;
    const photo = req.file ? `uploads/${req.file.filename}` : null;

    // Validate required inputs
    if (!businessType || !businessTitle || !contactNumber || !address || !countryId || !stateId || !cityId || !description || !email) {
        return res.status(400).json({ error: 'All required fields are missing', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const indianDateTime = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // Check if a new photo is uploaded and update the query accordingly
    let updateQuery = `
        UPDATE businessconnect
        SET businessType = ?, businessTitle = ?, contactNumber = ?, address = ?, countryId = ?, stateId = ?, cityId = ?, 
            description = ?, email = ?, website = ?, updatedDate = ? 
    `;

    const values = [businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, description, email, website || null, indianDateTime];

    if (photo) {
        updateQuery += `, photo = ? `;
        values.push(photo);
    }

    updateQuery += `WHERE businessId = ?`;
    values.push(businessId);

    dbConfig.query(updateQuery, values, (err, updateResults) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'A business connection with these details already exists', status: "false" });
            }
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any row was affected
        if (updateResults.affectedRows === 0) {
            return res.status(404).json({ error: 'Business connection not found', status: "false" });
        }

        // Fetch the updated business connection details
        const fetchQuery = 'SELECT * FROM businessconnect WHERE businessId = ?';
        dbConfig.query(fetchQuery, [businessId], (err, fetchResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            if (fetchResults.length === 0) {
                return res.status(404).json({ error: 'Business connection not found', status: "false" });
            }

            const updatedBusiness = fetchResults[0];

            // Successfully updated the business connection
            res.status(200).json({ message: 'Business connection updated successfully', status: "true", business: updatedBusiness });
        });
    });
});

// Endpoint to fetch business connections with pagination, search, and filters
router.get('/businesses', (req, res) => {
    const { page = 1, limit = 10, search = '', businessType = '', cityIds = '' } = req.query; // Extract query parameters
    const offset = (page - 1) * limit;

    // Convert cityIds to an array if it's a string
    const cityIdArray = Array.isArray(cityIds) ? cityIds : cityIds.split(',').map(id => id.trim()).filter(id => id); 

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // Base SQL query with JOINs to include countryName, stateName, and cityName
    let selectQuery = `
        SELECT 
            b.businessId,
            b.userId,
            CONCAT(u.firstname, ' ', u.lastname) AS username,   -- Concatenating firstname and lastname
            b.businessTitle,
            b.businessType,
            b.contactNumber,
            b.address,
            b.photo,
            b.countryId,
            c.name AS countryName,   -- Join for countryName
            b.stateId,
            s.name AS stateName,     -- Join for stateName
            b.cityId,
            ci.name AS cityName,     -- Join for cityName
            b.description,
            b.email,
            b.website,
            b.status,
            b.createdDate,
            b.updatedDate
        FROM businessconnect b
        LEFT JOIN country c ON b.countryId = c.countryId   -- Joining country table
        LEFT JOIN state s ON b.stateId = s.stateId         -- Joining state table
        LEFT JOIN city ci ON b.cityId = ci.cityId          -- Joining city table
        LEFT JOIN user u ON b.userId = u.userId            -- Joining user table to get the username
        WHERE b.status != 2
        ${search ? `AND (b.businessTitle LIKE ? OR b.description LIKE ?)` : ''}
        ${businessType ? `AND b.businessType = ?` : ''}
        ${cityIdArray.length ? `AND b.cityId IN (${cityIdArray.map(() => '?').join(', ')})` : ''}
        ORDER BY b.createdDate DESC
        LIMIT ? OFFSET ?;
    `;

    // Query values array
    let queryValues = [];
    if (search) {
        queryValues.push(`%${search}%`, `%${search}%`);
    }
    if (businessType) {
        queryValues.push(businessType);
    }
    if (cityIdArray.length) {
        queryValues.push(...cityIdArray);
    }
    queryValues.push(parseInt(limit), parseInt(offset));

    // Execute the query to fetch businesses
    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to count the total number of businesses based on filters
        let countQuery = `
            SELECT COUNT(*) AS total
            FROM businessconnect b
            LEFT JOIN country c ON b.countryId = c.countryId
            LEFT JOIN state s ON b.stateId = s.stateId
            LEFT JOIN city ci ON b.cityId = ci.cityId
            WHERE b.status != 2
            ${search ? `AND (b.businessTitle LIKE ? OR b.description LIKE ?)` : ''}
            ${businessType ? `AND b.businessType = ?` : ''}
            ${cityIdArray.length ? `AND b.cityId IN (${cityIdArray.map(() => '?').join(', ')})` : ''}
        `;

        let countQueryValues = [];
        if (search) {
            countQueryValues.push(`%${search}%`, `%${search}%`);
        }
        if (businessType) {
            countQueryValues.push(businessType);
        }
        if (cityIdArray.length) {
            countQueryValues.push(...cityIdArray);
        }

        // Execute the count query
        dbConfig.query(countQuery, countQueryValues, (err, countResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            const totalItems = countResults[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            // Return the list of businesses with pagination metadata
            res.status(200).json({
                status: "true",
                businessConnections: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});



// API to toggle the status of a business connection
router.put('/togglebusinessstatus/:businessId', (req, res) => {
    const { businessId } = req.params;

    // SQL query to fetch the current status of the business connection
    const selectQuery = 'SELECT status FROM businessconnect WHERE businessId = ?';
    const updateQuery = 'UPDATE businessconnect SET status = ? WHERE businessId = ?';

    dbConfig.query(selectQuery, [businessId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if business connection exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Business connection not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, businessId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            // Successfully toggled the business connection status
            res.status(200).json({ message: 'Business connection status updated successfully', status: "true" });
        });
    });
});

// Endpoint to fetch all active business categories
router.get('/businesscategories', (req, res) => {
    // SQL query to fetch all business categories with status = 1
    const selectQuery = 'SELECT * FROM businesscategory WHERE status = 1;';

    // Execute the query to fetch categories
    dbConfig.query(selectQuery, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Return the list of categories
        res.status(200).json({
            status: "true",
            categories: results
        });
    });
});



module.exports = router;