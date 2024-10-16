const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const multer = require('multer');
const path = require('path');
const IsUserAuthicated = require('../Middlewares/authMiddleware')
const userRole = require('../Middlewares/authorizeUserType')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/')); // Adjust path as needed
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
// Initialize upload with Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
}).single('photo');
// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}


router.post('/adduser', IsUserAuthicated ,userRole,(req, res) => {
    upload(req, res, err => {
        if (err) {
            return res.status(400).send(err);
        }

        const { firstName, lastName, contactNumber, email, dateOfBirth, age, gender, bloodGroup, education, address, countryId, stateId, cityId, userType, parentId } = req.body;
        const photo = req.file ? `uploads/${req.file.filename}` : null;

        // Validate mandatory fields for all users
        if (!firstName || !lastName || !dateOfBirth || !age || !gender || !address || !countryId || !stateId || !cityId || !userType ) {
            return res.status(400).json({ error: 'All required fields must be provided', status: "false" });
        }

        // Conditional validation: Email and contactNumber only required if age is 14 or above
        if (age >= 14) {
            if (!email || !contactNumber) {
                return res.status(400).json({ error: 'Email and contact number are required for users aged 14 and above', status: "false" });
            }
        }

        // Get current timestamp in Indian Standard Time (IST)
        const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

        // SQL query to insert a new user with createdDate
        const insertUserQuery = `
            INSERT INTO user
            (firstName, lastName, photo, contactNumber, email, dateOfBirth, age, gender, bloodGroup, education, address, countryId, stateId, cityId, createdDate, userType, parentId) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const userValues = [firstName, lastName, photo, contactNumber || null, email || null, dateOfBirth, age, gender, bloodGroup, education, address, countryId, stateId, cityId, createdDate, userType, parentId];

        // Insert the user into the database
        dbConfig.query(insertUserQuery, userValues, (err, userResults) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'This contact number already exists', status: "false" });
                }
                return res.status(500).json({ error: err.message });
            }

            const newUserId = userResults.insertId; // Get the newly inserted userId

            // Get the last identityNumber from digitalcard
            const getLastIdentityNumberQuery = 'SELECT identityNumber FROM digitalcard ORDER BY identityNumber DESC LIMIT 1';

            dbConfig.query(getLastIdentityNumberQuery, (err, identityResults) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Calculate the next identityNumber
                let nextIdentityNumber = identityResults.length === 0 ? 1 : parseInt(identityResults[0].identityNumber) + 1;
                const formattedIdentityNumber = String(nextIdentityNumber).padStart(4, '0'); // Format to 0001, 0002, etc.

                // Insert the new digital card with the next identityNumber
                const insertDigitalCardQuery = `
                    INSERT INTO digitalcard (identityNumber, userId)
                    VALUES (?, ?)
                `;

                dbConfig.query(insertDigitalCardQuery, [formattedIdentityNumber, newUserId], (err, insertResults) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    // Successfully added new user and digital card
                    res.status(201).json({
                        message: 'User and digital card added successfully',
                        status: "true",
                        userId: newUserId,
                        identityNumber: formattedIdentityNumber
                    });
                });
            });
        });
    });
});



router.get('/user-digital-cards', IsUserAuthicated ,userRole, (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required', status: 'false' });
    }

    // SQL query to fetch digital card for the given userId with status = 1
    const userQuery = `
        SELECT u.firstName, u.lastName, u.contactNumber, u.email, u.photo, LPAD(dc.identityNumber, 4, '0') AS identityNumber
        FROM user u
        LEFT JOIN digitalcard dc ON u.userId = dc.userId
        WHERE u.userId = ? AND u.status = 1
    `;

    // SQL query to fetch digital cards for users where parentId = userId with status = 1
    const childrenQuery = `
        SELECT u.firstName, u.lastName, u.contactNumber, u.email, u.photo, LPAD(dc.identityNumber, 4, '0') AS identityNumber
        FROM user u
        LEFT JOIN digitalcard dc ON u.userId = dc.userId
        WHERE u.parentId = ? AND u.status = 1
    `;

    // Execute the first query to get the main user's digital card data
    dbConfig.query(userQuery, [userId], (err, userResults) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: 'false' });
        }

        // Execute the second query to get the digital card data for children users
        dbConfig.query(childrenQuery, [userId], (err, childrenResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: 'false' });
            }

            // Combine the main user and children digital card data into a single array
            const combinedResults = [...userResults, ...childrenResults];

            // Return the combined results in the response
            res.status(200).json({
                status: 'true',
                digitalCards: combinedResults,
            });
        });
    });
});

// API for editing a user
router.put('/edituser/:userId',IsUserAuthicated ,(req, res) => {
    upload(req, res, err => {
        if (err) {
            return res.status(400).send(err);
        }
        
        const { userId } = req.params;
        const { firstName, lastName, contactNumber, email, dateOfBirth, age, gender, bloodGroup, education, address, countryId, stateId, cityId, parentId } = req.body;
        const newPhoto = req.file ? `uploads/${req.file.filename}` : null; // New photo if uploaded, otherwise null

        // Validate inputs
        if (!firstName || !lastName || !contactNumber || !email || !dateOfBirth || !age || !gender || !address || !countryId || !stateId || !cityId) {
            return res.status(400).json({ error: 'All fields are required', status: "false" });
        }

        // Fetch existing user to get current photo
        dbConfig.query('SELECT photo FROM user WHERE userId = ?', [userId], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found', status: "false" });
            }

            // Use existing photo if no new photo is uploaded
            const existingPhoto = results[0].photo;
            const photoToStore = newPhoto || existingPhoto;

            // SQL query to update user
            const updateQuery = `
                UPDATE user
                SET firstName = ?, lastName = ?, photo = ?, contactNumber = ?, email = ?, dateOfBirth = ?, age = ?, gender = ?, bloodGroup = ?, education = ?, address = ?, countryId = ?, stateId = ?, cityId = ?, updatedDate = ?, parentId = ?
                WHERE userId = ?;
            `;
            const values = [firstName, lastName, photoToStore, contactNumber, email, dateOfBirth, age, gender, bloodGroup, education, address, countryId, stateId, cityId, moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), parentId || 0, userId];

            dbConfig.query(updateQuery, values, (err, updateResults) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ error: 'This contact number already exists', status: "false" });
                    }
                    return res.status(500).json({ error: err.message });
                }

                if (updateResults.affectedRows === 0) {
                    return res.status(404).json({ error: 'User not found', status: "false" });
                }

                // Fetch updated user
                dbConfig.query('SELECT * FROM user WHERE userId = ?', [userId], (err, fetchResults) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    if (fetchResults.length === 0) {
                        return res.status(404).json({ error: 'User not found', status: "false" });
                    }

                    res.status(200).json({ message: 'User updated successfully', status: "true", user: fetchResults[0] });
                });
            });
        });
    });
});


// Users list filtered by parentId
router.get('/allusers', IsUserAuthicated , userRole ,(req, res) => {
    const { parentId } = req.query; // Extract parentId from query parameters

    // SQL query to fetch users where status is not 2, and join with countries, states, and cities tables
    // Also, filter by parentId if provided
    const selectQuery = `
    SELECT u.userId, u.firstName, u.lastName, u.photo, u.contactNumber, u.email, u.dateOfBirth, u.age, u.gender, u.bloodGroup, u.education, u.address, u.userType, u.status, u.createdDate, u.updatedDate, u.parentId,
           c.name AS countryName, 
           s.name AS stateName, 
           ci.name AS cityName 
    FROM user u
    LEFT JOIN country c ON u.countryId = c.countryId
    LEFT JOIN state s ON u.stateId = s.stateId
    LEFT JOIN city ci ON u.cityId = ci.cityId
    WHERE u.status <> 2
    ${parentId ? `AND u.parentId = ?` : ''}
    ORDER BY u.userId DESC
`;

    const queryValues = parentId ? [parentId] : [];

    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Return the list of users with country, state, and city names
        // If no users found for the given parentId, return an empty array
        res.status(200).json({ status: "true", users: results });
    });
});


router.get('/users', IsUserAuthicated ,(req, res) => {
    const { parentId, cityIds, page = 1, limit = 10, search = '' } = req.query; // Extract parentId, cityIds (comma-separated), page, limit, and search from query parameters
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // Convert cityIds from comma-separated string to an array if provided
    const cityIdArray = cityIds ? cityIds.split(',') : [];

    // SQL query to fetch users with pagination, filtering by parentId, cityIds if provided, and join with countries, states, and cities tables
    let selectQuery = `
        SELECT u.userId, u.firstName, u.lastName, u.photo, u.contactNumber, u.email, u.dateOfBirth, u.age, u.gender, u.bloodGroup, u.education, u.address, u.userType, u.status, u.createdDate, u.updatedDate, u.parentId,
               c.name AS countryName, 
               s.name AS stateName, 
               ci.name AS cityName,
               (
                   SELECT COUNT(*) 
                   FROM user f 
                   WHERE f.parentId = u.userId
               ) AS familyMemberCount
        FROM user u
        LEFT JOIN country c ON u.countryId = c.countryId
        LEFT JOIN state s ON u.stateId = s.stateId
        LEFT JOIN city ci ON u.cityId = ci.cityId
        WHERE u.status <> 2
        ${parentId ? `AND u.parentId = ?` : ''}
        ${cityIdArray.length > 0 ? `AND u.cityId IN (${cityIdArray.map(() => '?').join(', ')})` : ''}
        ${search ? `AND (u.firstName LIKE ? OR u.lastName LIKE ?)` : ''}
        ORDER BY u.userId DESC
        LIMIT ? OFFSET ?
    `;

    // Include pagination parameters and search parameter in the query values
    const queryValues = [];
    if (parentId) queryValues.push(parentId);
    if (cityIdArray.length > 0) queryValues.push(...cityIdArray);
    if (search) {
        queryValues.push(`%${search}%`, `%${search}%`);
    }
    queryValues.push(parseInt(limit), parseInt(offset));

    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to get the total number of users for pagination purposes
        let countQuery = `
            SELECT COUNT(*) AS total
            FROM user u
            WHERE u.status <> 2
            ${parentId ? `AND u.parentId = ?` : ''}
            ${cityIdArray.length > 0 ? `AND u.cityId IN (${cityIdArray.map(() => '?').join(', ')})` : ''}
            ${search ? `AND (u.firstName LIKE ? OR u.lastName LIKE ?)` : ''}
        `;

        let countQueryValues = [];
        if (parentId) countQueryValues.push(parentId);
        if (cityIdArray.length > 0) countQueryValues.push(...cityIdArray);
        if (search) {
            countQueryValues.push(`%${search}%`, `%${search}%`);
        }

        dbConfig.query(countQuery, countQueryValues, (err, countResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            const totalItems = countResults[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            // Return the list of users with country, state, and city names along with pagination metadata
            res.status(200).json({
                status: "true",
                users: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});


// Api for userdetails
router.get('/userdetails',IsUserAuthicated ,(req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ error: 'Please Enter User ID', status: "false" });
    }

    // SQL query with JOINs to fetch country, state, and city names
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
        WHERE user.userId = ?
    `;

    dbConfig.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if user exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        const user = results[0];

        // Respond with user details including country, state, and city names
        res.status(200).json({
            message: 'User Details',
            status: "true",
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
                otp: user.otp,
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


// Endpoint to soft delete a user
router.put('/deleteuser/:userId', IsUserAuthicated,(req, res) => {
    const { userId } = req.params;

    // SQL query to update the user's status to 2 (soft delete)
    const query = `
        UPDATE user
        SET status = 2
        WHERE userId = ?;
    `;
    const values = [userId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        // Successfully soft deleted the user
        res.status(200).json({ message: 'User deleted successfully', status: "true" });
    });
});

//Api for change status
router.put('/toggleuserstatus/:userId',IsUserAuthicated ,(req, res) => {
    const { userId } = req.params;

    // SQL query to fetch the current status of the user
    const selectQuery = 'SELECT status FROM user WHERE userId = ?';
    const updateQuery = 'UPDATE user SET status = ? WHERE userId = ?';

    dbConfig.query(selectQuery, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if user exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, userId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully toggled the user status
            res.status(200).json({ message: 'User status updated successfully', status: "true" });
        });
    });
});

// Endpoint to fetch the list of countries
router.get('/countries', IsUserAuthicated , (req, res) => {
    const query = 'SELECT countryId, name FROM country';
    
    dbConfig.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});


router.get('/states/:countryId?', IsUserAuthicated , (req, res) => {
    const countryId = req.params.countryId; // Extract countryId from URL parameters

    // SQL query to fetch states based on the presence of countryId
    let query;
    let params = [];

    if (countryId) {
        query = `
            SELECT stateId, name
            FROM state
            WHERE status <> 2 AND countryId = ?
        `;
        params = [countryId];
    } else {
        query = `
            SELECT stateId, name
            FROM state
            WHERE status <> 2
        `;
    }

    // Execute the query
    dbConfig.query(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Endpoint to fetch the list of cities based on stateId
router.get('/cities/:stateId?', IsUserAuthicated , (req, res) => {
    const stateId = req.params.stateId; // Extract stateId from URL parameters

    // SQL query to fetch cities based on the presence of stateId
    let query;
    let params = [];

    if (stateId) {
        query = `
            SELECT cityId, name
            FROM city
            WHERE status <> 2 AND stateId = ?
        `;
        params = [stateId];
    } else {
        query = `
            SELECT cityId, name
            FROM city
            WHERE status <> 2
        `;
    }

    // Execute the query
    dbConfig.query(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// router.post('/adddonor', (req, res) => {
//     const { name } = req.body;
//     console.log('req.body:', req.body);
//     const photo = req.file ? `uploads/${req.file.filename}` : null; // Handle photo upload

//     // Validate inputs
//     if (!name) {
//         return res.status(400).json({ error: 'Name is required', status: "false" });
//     }

//     // Get the current timestamp in IST
//     const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

//     // SQL query to insert a new donor with the createdDate field
//     const query = `INSERT INTO donors (name, photo, createdDate) VALUES (?, ?, ?)`;
//     const values = [name, photo, createdDate];

//     dbConfig.query(query, values, (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }

//         // Successfully added new donor
//         res.status(201).json({ message: 'Donor added successfully', status: "true", donorId: results.insertId });
//     });
// });

// Route to handle donor creation
router.post('/adddonors', IsUserAuthicated , (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err, status: 'false' });
    }

    // Log incoming data for debugging
    console.log('req.body:', req.body); // Should contain 'name'
    console.log('req.file:', req.file);  // Should contain file info

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required', status: 'false' });
    }

    const photo = req.file ? `uploads/${req.file.filename}` : null;

    if (!photo) {
      return res.status(400).json({ error: 'Photo is required', status: 'false' });
    }

    // Database insert logic here
    const query = `INSERT INTO donors (name, photo, status) VALUES (?, ?, ?)`;
    const values = [name, photo, 1]; // Assuming 'status' is always 1 for active donors

    dbConfig.query(query, values, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message, status: 'false' });
      }

      res.status(201).json({ status: 'true', message: 'Donor created successfully' });
    });
  });
});

router.get('/donors', IsUserAuthicated , (req, res) => {
    // Extract page and limit from query parameters, with default values
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // SQL query to select donors with status 1 and apply pagination
    const selectQuery = `
        SELECT * FROM donors
        WHERE status <> 2
        LIMIT ? OFFSET ?
    `;

    const queryValues = [parseInt(limit), parseInt(offset)];

    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to get the total number of donors for pagination
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM donors
            WHERE status <> 2
        `;

        dbConfig.query(countQuery, (err, countResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            const totalItems = countResults[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            // Return the list of donors along with pagination metadata
            res.status(200).json({
                status: "true",
                donors: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});



router.get('/donor/:id',IsUserAuthicated ,(req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM donors WHERE id = ?`;

    dbConfig.query(query, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Donor not found', status: "false" });
        }

        res.status(200).json({ status: "true", donor: results[0] });
    });
});

// Endpoint for editing a donor
router.put('/editdonor/:id',IsUserAuthicated , (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err, status: 'false' });
        }

        const { id } = req.params;
        const { name } = req.body;
        const newPhoto = req.file ? `uploads/${req.file.filename}` : null; // New photo if uploaded, otherwise null

        // Validate inputs
        if (!name) {
            return res.status(400).json({ error: 'Name is required', status: "false" });
        }

        // Fetch existing donor to get current photo
        dbConfig.query('SELECT photo FROM donors WHERE id = ?', [id], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Donor not found', status: "false" });
            }

            // Use existing photo if no new photo is uploaded
            const existingPhoto = results[0].photo;
            const photoToStore = newPhoto || existingPhoto;

            // SQL query to update donor
            const updateQuery = `
                UPDATE donors
                SET name = ?, photo = ?, updatedDate = ?
                WHERE id = ?;
            `;
            const values = [name, photoToStore, moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), id];

            dbConfig.query(updateQuery, values, (err, updateResults) => {
                if (err) {
                    return res.status(500).json({ error: err.message, status: "false" });
                }

                if (updateResults.affectedRows === 0) {
                    return res.status(404).json({ error: 'Donor not found', status: "false" });
                }

                // Fetch updated donor
                dbConfig.query('SELECT * FROM donors WHERE id = ?', [id], (err, fetchResults) => {
                    if (err) {
                        return res.status(500).json({ error: err.message, status: "false" });
                    }

                    if (fetchResults.length === 0) {
                        return res.status(404).json({ error: 'Donor not found', status: "false" });
                    }

                    res.status(200).json({ message: 'Donor updated successfully', status: "true", donor: fetchResults[0] });
                });
            });
        });
    });
});


router.put('/deletedonor/:id', IsUserAuthicated , (req, res) => {
    const { id } = req.params;

    // SQL query to soft delete the donor by setting status to 2
    const query = `UPDATE donors SET status = 2 WHERE id = ?`;

    dbConfig.query(query, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Donor not found', status: "false" });
        }

        res.status(200).json({ message: 'Donor soft-deleted successfully', status: "true" });
    });
});

router.put('/togglestatus/:id',IsUserAuthicated , (req, res) => {
    const { id } = req.params;

    // Step 1: Get the current status of the donor
    const getStatusQuery = `SELECT status FROM donors WHERE id = ?`;

    dbConfig.query(getStatusQuery, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Donor not found', status: "false" });
        }

        const currentStatus = results[0].status;

        // Step 2: Determine the new status (toggle between 1 and 2)
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Step 3: Update the donor status
        const updateStatusQuery = `UPDATE donors SET status = ? WHERE id = ?`;
        
        dbConfig.query(updateStatusQuery, [newStatus, id], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            res.status(200).json({ message: `Donor status updated successfully to ${newStatus}`, status: "true" });
        });
    });
});



module.exports = router;