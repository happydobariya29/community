const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const app = express();
const multer = require('multer');
const path = require('path');



app.use(express.json());

// Storage for profilePic
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'profilePic') {
      cb(null, path.join(__dirname, '../uploads/')); // Path for profilePic
    } else if (file.fieldname === 'biodata') {
      cb(null, path.join(__dirname, '../magazines/')); // Path for biodata
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File type checking functions
function checkImageFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

function checkPDFFileType(file, cb) {
    const filetypes = /pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Error: PDFs Only!');
    }
}

// Multer setup for multiple fields
const upload = multer({
    storage: profilePicStorage,
    limits: { fileSize: 5000000 }, // 5MB limit for both files
    fileFilter: function(req, file, cb) {
        if (file.fieldname === 'profilePic') {
            checkImageFileType(file, cb);
        } else if (file.fieldname === 'biodata') {
            checkPDFFileType(file, cb);
        }
    }
}).fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'biodata', maxCount: 1 }
]);


// API for adding a matrimonial profile with updated fields and file handling
router.post('/addmatrimonial', (req, res) => {
    upload(req, res, err => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        const {
            firstName,
            middleName,
            lastName,
            contactNumber,
            dateOfBirth,
            age,
            gender,
            countryId,
            stateId,
            cityId,
            education,
            status
        } = req.body;

        const profilePic = req.files['profilePic'] ? `uploads/${req.files['profilePic'][0].filename}` : null;
        const biodata = req.files['biodata'] ? `magazines/${req.files['biodata'][0].filename}` : null;

        // Validate required inputs
        if (!contactNumber || !firstName || !lastName || !age || !dateOfBirth || !profilePic || !biodata || !gender || !countryId || !stateId || !cityId || !education) {
            return res.status(400).json({ error: 'All fields are required', status: "false" });
        }

        // Get current timestamp in Indian Standard Time (IST)
        const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');
        const updatedDate = createdDate;

        // SQL query to insert a new matrimonial profile
        const query = `
            INSERT INTO matrimonialprofiles
            (firstName, middleName, lastName, contactNumber, dateOfBirth, age, profilePic, biodata, status, createdDate, updatedDate, gender, countryId, stateId, cityId, education)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            firstName, middleName, lastName, contactNumber, dateOfBirth, age, profilePic, biodata, status || 1, createdDate, updatedDate, gender, countryId, stateId, cityId, education
        ];

        dbConfig.query(query, values, (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            // Successfully added new matrimonial profile
            res.status(201).json({
                message: 'Matrimonial profile added successfully',
                status: "true",
                matrimonialId: results.insertId
            });
        });
    });
});

// Endpoint to update an existing matrimonial profile's details
router.put('/editmatrimonial/:matrimonialId', (req, res) => {
  const { matrimonialId } = req.params;

  // Handle file uploads
  upload(req, res, err => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const {
      contactNumber,
      firstName,
      middleName,
      lastName,
      age,
      dateOfBirth,
      gender,
      countryId,
      stateId,
      cityId,
      education,
      status
    } = req.body;

    // Determine new file paths if files were uploaded
    const profilePic = req.files['profilePic'] ? `uploads/${req.files['profilePic'][0].filename}` : req.body.profilePic;
    const biodata = req.files['biodata'] ? `magazines/${req.files['biodata'][0].filename}` : req.body.biodata;

    // Validate required inputs
    if (!contactNumber || !firstName || !lastName || !age || !dateOfBirth || !gender || !countryId || !stateId || !cityId || !education) {
      return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Format current timestamp for IST (Indian Standard Time)
    const updatedDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

    // SQL query to update the matrimonial profile's details including updatedDate
    const updateQuery = `
      UPDATE matrimonialprofiles
      SET contactNumber = ?, biodata = ?, firstName = ?, middleName = ?, lastName = ?,
          age = ?, profilePic = ?, dateOfBirth = ?, updatedDate = ?, gender = ?, 
          countryId = ?, stateId = ?, cityId = ?, education = ?, status = ?
      WHERE matrimonialId = ?;
    `;
    const values = [
      contactNumber, biodata, firstName, middleName, lastName, age, profilePic, dateOfBirth, updatedDate, 
      gender, countryId, stateId, cityId, education, status || 1, matrimonialId
    ];

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
});



// Endpoint to soft delete a matrimonial profile
router.put('/deletematrimonial/:matrimonialId', (req, res) => {
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
router.put('/togglematrimonialstatus/:matrimonialId', (req, res) => {
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


router.get('/matrimonialprofiles', (req, res) => {
    const { 
        page = 1, 
        limit = 10, 
        search = '', 
        minAge, 
        maxAge, 
        cityIds = '', 
        gender 
    } = req.query; // Extract cityIds (comma-separated)
    
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // Build the base SQL query with joins to get country, state, and city names
    let selectQuery = `
        SELECT m.*, 
               c.name AS countryName, 
               s.name AS stateName, 
               ci.name AS cityName
        FROM matrimonialprofiles m
        LEFT JOIN country c ON m.countryId = c.countryId
        LEFT JOIN state s ON m.stateId = s.stateId
        LEFT JOIN city ci ON m.cityId = ci.cityId
        WHERE m.status != 2
    `;

    // Array to hold the query values
    let queryValues = [];

    // Add search filter for firstName, middleName, lastName
    if (search) {
        selectQuery += ` AND (m.firstName LIKE ? OR m.middleName LIKE ? OR m.lastName LIKE ?)`;
        queryValues.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Add filter for age range if provided
    if (minAge && maxAge) {
        selectQuery += ` AND m.age BETWEEN ? AND ?`;
        queryValues.push(minAge, maxAge);
    } else if (minAge) {
        selectQuery += ` AND m.age >= ?`;
        queryValues.push(minAge);
    } else if (maxAge) {
        selectQuery += ` AND m.age <= ?`;
        queryValues.push(maxAge);
    }

    // Add filter for gender if provided
    if (gender) {
        selectQuery += ` AND m.gender = ?`;
        queryValues.push(gender);
    }

    // Handle multiple cityIds (comma-separated) if provided
    const cityIdArray = cityIds ? cityIds.split(',') : [];
    if (cityIdArray.length > 0) {
        selectQuery += ` AND m.cityId IN (${cityIdArray.map(() => '?').join(', ')})`;
        queryValues.push(...cityIdArray);
    }

    // Add sorting and pagination
    selectQuery += `
        ORDER BY m.createdDate DESC
        LIMIT ? OFFSET ?
    `;
    queryValues.push(parseInt(limit), parseInt(offset));

    // Execute the SQL query
    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to get the total number of profiles for pagination purposes
        let countQuery = `
            SELECT COUNT(*) AS total
            FROM matrimonialprofiles m
            WHERE m.status != 2
        `;

        // Add filters to the count query
        let countQueryValues = [];
        if (search) {
            countQuery += ` AND (m.firstName LIKE ? OR m.middleName LIKE ? OR m.lastName LIKE ?)`;
            countQueryValues.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (minAge && maxAge) {
            countQuery += ` AND m.age BETWEEN ? AND ?`;
            countQueryValues.push(minAge, maxAge);
        } else if (minAge) {
            countQuery += ` AND m.age >= ?`;
            countQueryValues.push(minAge);
        } else if (maxAge) {
            countQuery += ` AND m.age <= ?`;
            countQueryValues.push(maxAge);
        }
        if (gender) {
            countQuery += ` AND m.gender = ?`;
            countQueryValues.push(gender);
        }
        if (cityIdArray.length > 0) {
            countQuery += ` AND m.cityId IN (${cityIdArray.map(() => '?').join(', ')})`;
            countQueryValues.push(...cityIdArray);
        }

        // Execute count query to get the total number of profiles
        dbConfig.query(countQuery, countQueryValues, (err, countResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            const totalItems = countResults[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            // Return the list of profiles along with pagination metadata
            res.status(200).json({
                status: "true",
                matrimonialProfiles: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});


// API for matrimonial profile details endpoint
router.get('/matrimonialdetails', (req, res) => {
    const { matrimonialId } = req.query;

    if (!matrimonialId) {
        return res.status(400).json({ error: 'Please provide matrimonial ID', status: "false" });
    }

    // SQL query to fetch matrimonial profile details with country, state, city names and other fields
    const query = `
        SELECT m.matrimonialId, m.contactNumber, m.firstName, m.middleName, m.lastName, m.age, 
               m.dateOfBirth, m.profilePic, m.biodata, m.status, m.createdDate, m.updatedDate, 
               m.gender, m.education,
               c.name AS countryName, s.name AS stateName, ci.name AS cityName
        FROM matrimonialprofiles m
        LEFT JOIN country c ON m.countryId = c.countryId
        LEFT JOIN state s ON m.stateId = s.stateId
        LEFT JOIN city ci ON m.cityId = ci.cityId
        WHERE m.matrimonialId = ?
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