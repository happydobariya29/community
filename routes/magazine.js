// const express = require('express');
// const router = express.Router();
// const moment = require('moment-timezone');
// const dbConfig = require("./dbconfig");
// const app = express();
// const multer = require('multer');
// const path = require('path');
// const IsUserAuthicated = require('../Middlewares/authMiddleware')
//
//
// app.use(express.json());
//
// // Storage for profilePic
// const profilePicStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     if (file.fieldname === 'profilePic') {
//       cb(null, path.join(__dirname, '../uploads/')); // Path for profilePic
//     } else if (file.fieldname === 'biodata') {
//       cb(null, path.join(__dirname, '../magazines/')); // Path for biodata
//     }
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   }
// });
//
// // File type checking functions
// function checkImageFileType(file, cb) {
//     const filetypes = /jpeg|jpg|png|gif/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
//     if (extname && mimetype) {
//         return cb(null, true);
//     } else {
//         cb('Error: Images Only!');
//     }
// }
//
// function checkPDFFileType(file, cb) {
//     const filetypes = /pdf/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);
//     if (extname && mimetype) {
//         return cb(null, true);
//     } else {
//         cb('Error: PDFs Only!');
//     }
// }
//
// // Multer setup for multiple fields
// const upload = multer({
//     storage: profilePicStorage,
//     limits: { fileSize: 5000000 }, // 5MB limit for both files
//     fileFilter: function(req, file, cb) {
//         if (file.fieldname === 'profilePic') {
//             checkImageFileType(file, cb);
//         } else if (file.fieldname === 'biodata') {
//             checkPDFFileType(file, cb);
//         }
//     }
// }).fields([
//     { name: 'profilePic', maxCount: 1 },
//     { name: 'biodata', maxCount: 1 }
// ]);
//
//
// // API for adding a matrimonial profile with updated fields and file handling
// router.post('/addmatrimonial',IsUserAuthicated, (req, res) => {
//     upload(req, res, err => {
//         if (err) {
//             return res.status(400).json({ error: err.message });
//         }
//
//         const {
//             firstName,
//             middleName,
//             lastName,
//             contactNumber,
//             dateOfBirth,
//             age,
//             gender,
//             countryId,
//             stateId,
//             cityId,
//             education,
//             status
//         } = req.body;
//
//         const profilePic = req.files['profilePic'] ? `uploads/${req.files['profilePic'][0].filename}` : null;
//         const biodata = req.files['biodata'] ? `magazines/${req.files['biodata'][0].filename}` : null;
//
//         // Validate required inputs
//         if (!contactNumber || !firstName || !lastName || !age || !dateOfBirth || !profilePic || !biodata || !gender || !countryId || !stateId || !cityId || !education) {
//             return res.status(400).json({ error: 'All fields are required', status: "false" });
//         }
//
//         // Get current timestamp in Indian Standard Time (IST)
//         const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
//         const updatedDate = createdDate;
//
//         // SQL query to insert a new matrimonial profile
//         const query = `
//             INSERT INTO matrimonialprofiles
//             (firstName, middleName, lastName, contactNumber, dateOfBirth, age, profilePic, biodata, status, createdDate, updatedDate, gender, countryId, stateId, cityId, education)
//             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `;
//         const values = [
//             firstName, middleName, lastName, contactNumber, dateOfBirth, age, profilePic, biodata, status || 1, createdDate, updatedDate, gender, countryId, stateId, cityId, education
//         ];
//
//         dbConfig.query(query, values, (err, results) => {
//             if (err) {
//                 return res.status(500).json({ error: err.message, status: "false" });
//             }
//
//             // Successfully added new matrimonial profile
//             res.status(201).json({
//                 message: 'Matrimonial profile added successfully',
//                 status: "true",
//                 matrimonialId: results.insertId
//             });
//         });
//     });
// });
//
// // Endpoint to update an existing matrimonial profile's details
// router.put('/editmatrimonial/:matrimonialId',IsUserAuthicated, (req, res) => {
//   const { matrimonialId } = req.params;
//
//   // Handle file uploads
//   upload(req, res, err => {
//     if (err) {
//       return res.status(400).json({ error: err.message });
//     }
//
//     const {
//       contactNumber,
//       firstName,
//       middleName,
//       lastName,
//       age,
//       dateOfBirth,
//       gender,
//       countryId,
//       stateId,
//       cityId,
//       education,
//       status
//     } = req.body;
//
//     // Determine new file paths if files were uploaded
//     const profilePic = req.files['profilePic'] ? `uploads/${req.files['profilePic'][0].filename}` : req.body.profilePic;
//     const biodata = req.files['biodata'] ? `magazines/${req.files['biodata'][0].filename}` : req.body.biodata;
//
//     // Validate required inputs
//     if (!contactNumber || !firstName || !lastName || !age || !dateOfBirth || !gender || !countryId || !stateId || !cityId || !education) {
//       return res.status(400).json({ error: 'All fields are required', status: "false" });
//     }
//
//     // Format current timestamp for IST (Indian Standard Time)
//     const updatedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
//
//     // SQL query to update the matrimonial profile's details including updatedDate
//     const updateQuery = `
//       UPDATE matrimonialprofiles
//       SET contactNumber = ?, biodata = ?, firstName = ?, middleName = ?, lastName = ?,
//           age = ?, profilePic = ?, dateOfBirth = ?, updatedDate = ?, gender = ?,
//           countryId = ?, stateId = ?, cityId = ?, education = ?, status = ?
//       WHERE matrimonialId = ?;
//     `;
//     const values = [
//       contactNumber, biodata, firstName, middleName, lastName, age, profilePic, dateOfBirth, updatedDate,
//       gender, countryId, stateId, cityId, education, status || 1, matrimonialId
//     ];
//
//     dbConfig.query(updateQuery, values, (err, updateResults) => {
//       if (err) {
//         if (err.code === 'ER_DUP_ENTRY') {
//           return res.status(400).json({ error: 'A matrimonial profile with these details already exists', status: "false" });
//         }
//         return res.status(500).json({ error: err.message, status: "false" });
//       }
//
//       // Check if any row was affected
//       if (updateResults.affectedRows === 0) {
//         return res.status(404).json({ error: 'Matrimonial profile not found', status: "false" });
//       }
//
//       // Fetch the updated matrimonial profile details
//       const fetchQuery = 'SELECT * FROM matrimonialprofiles WHERE matrimonialId = ?';
//       dbConfig.query(fetchQuery, [matrimonialId], (err, fetchResults) => {
//         if (err) {
//           return res.status(500).json({ error: err.message, status: "false" });
//         }
//
//         if (fetchResults.length === 0) {
//           return res.status(404).json({ error: 'Matrimonial profile not found', status: "false" });
//         }
//
//         const updatedMatrimonial = fetchResults[0];
//
//         // Successfully updated the matrimonial profile
//         res.status(200).json({ message: 'Matrimonial profile updated successfully', status: "true", matrimonial: updatedMatrimonial });
//       });
//     });
//   });
// });
//
//
//
// // Endpoint to soft delete a matrimonial profile
// router.put('/deletematrimonial/:matrimonialId', IsUserAuthicated,(req, res) => {
//     const { matrimonialId } = req.params;
//
//     // SQL query to update the matrimonial profile's status to 2 (soft delete)
//     const query = `
//         UPDATE matrimonialprofiles
//         SET status = 2
//         WHERE matrimonialId = ?;
//     `;
//     const values = [matrimonialId];
//
//     dbConfig.query(query, values, (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }
//
//         // Check if any row was affected
//         if (results.affectedRows === 0) {
//             return res.status(404).json({ error: 'Matrimonial profile not found', status: "false" });
//         }
//
//         // Successfully soft deleted the matrimonial profile
//         res.status(200).json({ message: 'Matrimonial profile deleted successfully', status: "true" });
//     });
// });
//
//
//
//
// // API to toggle the status of a matrimonial profile
// router.put('/togglematrimonialstatus/:matrimonialId',IsUserAuthicated, (req, res) => {
//     const { matrimonialId } = req.params;
//
//     // SQL query to fetch the current status of the matrimonial profile
//     const selectQuery = 'SELECT status FROM matrimonialprofiles WHERE matrimonialId = ?';
//     const updateQuery = 'UPDATE matrimonialprofiles SET status = ? WHERE matrimonialId = ?';
//
//     dbConfig.query(selectQuery, [matrimonialId], (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }
//
//         // Check if matrimonial profile exists
//         if (results.length === 0) {
//             return res.status(404).json({ error: 'Matrimonial profile not found', status: "false" });
//         }
//
//         const currentStatus = results[0].status;
//         const newStatus = currentStatus === 1 ? 0 : 1;
//
//         // Update the status
//         dbConfig.query(updateQuery, [newStatus, matrimonialId], (err, updateResults) => {
//             if (err) {
//                 return res.status(500).json({ error: err.message, status: "false" });
//             }
//
//             // Successfully toggled the matrimonial profile status
//             res.status(200).json({ message: 'Matrimonial profile status updated successfully', status: "true" });
//         });
//     });
// });
//
//
// router.get('/matrimonialprofiles',IsUserAuthicated, (req, res) => {
//     const {
//         page = 1,
//         limit = 10,
//         search = '',
//         minAge,
//         maxAge,
//         cityIds = '',
//         gender
//     } = req.query; // Extract cityIds (comma-separated)
//
//     const offset = (page - 1) * limit;
//
//     // Validate pagination parameters
//     if (page < 1 || limit < 1) {
//         return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
//     }
//
//     // Build the base SQL query with joins to get country, state, and city names
//     let selectQuery = `
//         SELECT m.*,
//                c.name AS countryName,
//                s.name AS stateName,
//                ci.name AS cityName
//         FROM matrimonialprofiles m
//         LEFT JOIN country c ON m.countryId = c.countryId
//         LEFT JOIN state s ON m.stateId = s.stateId
//         LEFT JOIN city ci ON m.cityId = ci.cityId
//         WHERE m.status != 2
//     `;
//
//     // Array to hold the query values
//     let queryValues = [];
//
//     // Add search filter for firstName, middleName, lastName
//     if (search) {
//         selectQuery += ` AND (m.firstName LIKE ? OR m.middleName LIKE ? OR m.lastName LIKE ?)`;
//         queryValues.push(`%${search}%`, `%${search}%`, `%${search}%`);
//     }
//
//     // Add filter for age range if provided
//     if (minAge && maxAge) {
//         selectQuery += ` AND m.age BETWEEN ? AND ?`;
//         queryValues.push(minAge, maxAge);
//     } else if (minAge) {
//         selectQuery += ` AND m.age >= ?`;
//         queryValues.push(minAge);
//     } else if (maxAge) {
//         selectQuery += ` AND m.age <= ?`;
//         queryValues.push(maxAge);
//     }
//
//     // Add filter for gender if provided
//     if (gender) {
//         selectQuery += ` AND m.gender = ?`;
//         queryValues.push(gender);
//     }
//
//     // Handle multiple cityIds (comma-separated) if provided
//     const cityIdArray = cityIds ? cityIds.split(',') : [];
//     if (cityIdArray.length > 0) {
//         selectQuery += ` AND m.cityId IN (${cityIdArray.map(() => '?').join(', ')})`;
//         queryValues.push(...cityIdArray);
//     }
//
//     // Add sorting and pagination
//     selectQuery += `
//         ORDER BY m.createdDate DESC
//         LIMIT ? OFFSET ?
//     `;
//     queryValues.push(parseInt(limit), parseInt(offset));
//
//     // Execute the SQL query
//     dbConfig.query(selectQuery, queryValues, (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }
//
//         // Query to get the total number of profiles for pagination purposes
//         let countQuery = `
//             SELECT COUNT(*) AS total
//             FROM matrimonialprofiles m
//             WHERE m.status != 2
//         `;
//
//         // Add filters to the count query
//         let countQueryValues = [];
//         if (search) {
//             countQuery += ` AND (m.firstName LIKE ? OR m.middleName LIKE ? OR m.lastName LIKE ?)`;
//             countQueryValues.push(`%${search}%`, `%${search}%`, `%${search}%`);
//         }
//         if (minAge && maxAge) {
//             countQuery += ` AND m.age BETWEEN ? AND ?`;
//             countQueryValues.push(minAge, maxAge);
//         } else if (minAge) {
//             countQuery += ` AND m.age >= ?`;
//             countQueryValues.push(minAge);
//         } else if (maxAge) {
//             countQuery += ` AND m.age <= ?`;
//             countQueryValues.push(maxAge);
//         }
//         if (gender) {
//             countQuery += ` AND m.gender = ?`;
//             countQueryValues.push(gender);
//         }
//         if (cityIdArray.length > 0) {
//             countQuery += ` AND m.cityId IN (${cityIdArray.map(() => '?').join(', ')})`;
//             countQueryValues.push(...cityIdArray);
//         }
//
//         // Execute count query to get the total number of profiles
//         dbConfig.query(countQuery, countQueryValues, (err, countResults) => {
//             if (err) {
//                 return res.status(500).json({ error: err.message, status: "false" });
//             }
//
//             const totalItems = countResults[0].total;
//             const totalPages = Math.ceil(totalItems / limit);
//
//             // Return the list of profiles along with pagination metadata
//             res.status(200).json({
//                 status: "true",
//                 matrimonialProfiles: results,
//                 totalItems,
//                 totalPages,
//                 currentPage: parseInt(page),
//                 itemsPerPage: parseInt(limit)
//             });
//         });
//     });
// });
//
//
// // API for matrimonial profile details endpoint
// router.get('/matrimonialdetails',IsUserAuthicated,(req, res) => {
//     const { matrimonialId } = req.query;
//
//     if (!matrimonialId) {
//         return res.status(400).json({ error: 'Please provide matrimonial ID', status: "false" });
//     }
//
//     // SQL query to fetch matrimonial profile details with country, state, city names and other fields
//     const query = `
//         SELECT m.matrimonialId, m.contactNumber, m.firstName, m.middleName, m.lastName, m.age,
//                m.dateOfBirth, m.profilePic, m.biodata, m.status, m.createdDate, m.updatedDate,
//                m.gender, m.education,
//                c.name AS countryName, s.name AS stateName, ci.name AS cityName
//         FROM matrimonialprofiles m
//         LEFT JOIN country c ON m.countryId = c.countryId
//         LEFT JOIN state s ON m.stateId = s.stateId
//         LEFT JOIN city ci ON m.cityId = ci.cityId
//         WHERE m.matrimonialId = ?
//     `;
//
//     dbConfig.query(query, [matrimonialId], (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }
//
//         // Check if matrimonial profile exists
//         if (results.length === 0) {
//             return res.status(404).json({ error: 'Matrimonial profile not found', status: "false" });
//         }
//
//         const matrimonialProfile = results[0];
//
//         // Matrimonial profile details found successfully
//         res.status(200).json({
//             message: 'Matrimonial Profile Details',
//             status: "true",
//             matrimonialProfile: matrimonialProfile
//         });
//     });
// });
//
//
// module.exports = router;








































const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const multer = require('multer');
const path = require('path');
const IsUserAuthicated = require('../Middlewares/authMiddleware')

// // Set up multer storage configuration for PDF files
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(__dirname, '../magazines/')); // Save files to the magazines folder
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   }
// });

// // Initialize multer upload with storage configuration
// const upload = multer({
//     storage: storage,
//     limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//     fileFilter: function(req, file, cb) {
//         checkFileType(file, cb);
//     }
// }).single('magazine');

// // Check file type to allow only PDFs
// function checkFileType(file, cb) {
//     const filetypes = /pdf/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);

//     if (extname && mimetype) {
//         return cb(null, true);
//     } else {
//         cb('Error: Only PDF files are allowed!');
//     }
// }


// // API for adding a magazine
// router.post('/addmagazine', (req, res) => {
//     upload(req, res, err => {
//         if (err) {
//             return res.status(400).send(err);
//         }

//         const { title, description, date } = req.body;
//         const magazine = req.file ? `magazines/${req.file.filename}` : null;

//         // Validate inputs
//         if (!title || !description || !magazine) {
//             return res.status(400).json({ error: 'All fields are required, including the PDF file', status: "false" });
//         }

//         // Get current timestamp in Indian Standard Time (IST)
//         const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

//         // SQL query to insert a new magazine with createdDate and file path
//         const query = `
//             INSERT INTO magazine
//             (title, description, magazine, date, createdDate)
//             VALUES (?, ?, ?, ?, ?)
//         `;
//         const values = [title, description, magazine, date, createdDate];

//         dbConfig.query(query, values, (err, results) => {
//             if (err) {
//                 return res.status(500).json({ error: err.message, status: "false" });
//             }

//             // Successfully added new magazine
//             res.status(201).json({ message: 'Magazine added successfully', status: "true", magazineId: results.insertId });
//         });
//     });
// });

// Set up multer storage configuration for PDF files and images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save magazine PDFs in the magazines folder and photos in the photos folder
    if (file.fieldname === 'magazine') {
      cb(null, path.join(__dirname, '../magazines/'));
    } else if (file.fieldname === 'photo') {
      cb(null, path.join(__dirname, '../uploads/'));
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Initialize multer upload with storage configuration
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for each file
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
}).fields([
  { name: 'magazine', maxCount: 1 }, // Handle magazine PDF
  { name: 'photo', maxCount: 1 }     // Handle photo image
]);

// Check file type to allow only PDFs for magazine and images for photo
function checkFileType(file, cb) {
    const filetypes = file.fieldname === 'magazine' ? /pdf/ : /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Error: Only PDF files for magazines and image files (JPEG, PNG) for photos are allowed!');
    }
}

router.post('/addmagazine', IsUserAuthicated, (req, res) => {
    upload(req, res, err => {
        if (err) {
            return res.status(400).send(err);
        }

        // Check if files are present
        console.log(req.files);

        const { title, description, date, userId} = req.body;
        const magazine = req.files && req.files.magazine ? `magazines/${req.files.magazine[0].filename}` : null;
        const photo = req.files && req.files.photo ? `uploads/${req.files.photo[0].filename}` : null;

        // Validate inputs
        if (!title || !description || !magazine || !photo || !userId) {
            return res.status(400).json({ error: 'All fields are required, including the PDF and photo file', status: "false" });
        }

        // Get current timestamp in Indian Standard Time (IST)
        const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

        // SQL query to insert a new magazine with createdDate, photo, and name
        const query = `
            INSERT INTO magazine
            (title, description, magazine, date, createdDate, userId, photo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [title, description, magazine, date, createdDate, userId, photo];

        dbConfig.query(query, values, (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            // Successfully added new magazine with photo and name
            res.status(201).json({ message: 'Magazine added successfully', status: "true", magazineId: results.insertId });

            // After adding magazine, fetch tokens from the user table
            const tokenQuery = `SELECT token, userId FROM user WHERE token IS NOT NULL`;
            dbConfig.query(tokenQuery, (err, tokens) => {
                if (err) {
                    console.error('Error fetching user tokens:', err);
                    return; // Do not block the response to the client
                }

                // Prepare notification details
                const notificationPromises = tokens.map(user => {
                    const { token, userId } = user;

                    // Check if the token or userId is undefined
                    if (!token || !userId) {
                        console.warn('Token or userId is missing for user:', user);
                        return Promise.resolve(); // Skip this user
                    }

                    // Call sendnotification function for each user token
                    const notificationData = {
                        fcm_token: token,
                        device_type: 'android', // Default to 'android' if device type is not available
                        Title: `New Magazine Added: ${title}`,
                        Description: `Check out the new magazine titled "${title}". Click to view more details.`,
                        moduleName: 'Magazine',
                    };

                    // Send the notification
                    return sendnotification({ body: notificationData }, {
                        status: () => ({ json: () => null }) // Mock response
                    }).then(() => {
                        // After sending the notification, log it in the notifications table
                        const createdAt = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
                        const moduleName = 'Magazine'; // Module name

                        const notificationQuery = `
                            INSERT INTO notification (userId, moduleName, title, description, createdAt, status)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        const notificationValues = [userId, moduleName, title, description, createdAt, 0]; // Set initial status to 1

                        return new Promise((resolve, reject) => {
                            dbConfig.query(notificationQuery, notificationValues, (err, results) => {
                                if (err) {
                                    console.error('Error logging notification:', err);
                                    reject(err);
                                } else {
                                    resolve(results.insertId);
                                }
                            });
                        });
                    }).catch(err => {
                        console.error('Error sending notification:', err);
                    });
                });

                // Wait for all notifications to be sent and logged
                Promise.all(notificationPromises)
                    .then(() => {
                        console.log('All notifications sent and logged successfully');
                    })
                    .catch(err => {
                        console.error('Error in sending or logging notifications:', err);
                    });
            });
        });
    });
});


module.exports = router;