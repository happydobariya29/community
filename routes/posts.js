const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const dbConfig = require("./dbconfig");
const multer = require('multer');
const path = require('path');
const IsUserAuthicated = require('../Middlewares/authMiddleware')
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
    limits: { fileSize: 1000000 }, // 1MB limit per file
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
}).single('photo');  // Assuming only one photo for the post

// API for adding a post
router.post('/addpost',IsUserAuthicated, upload, (req, res) => {
    const { title, description, addedBy } = req.body;  // Extract addedBy from the request body
    const photo = req.file ? `uploads/${req.file.filename}` : null;

    // Validate required inputs
    if (!title || !description || !addedBy) {
        return res.status(400).json({ error: 'All fields are required', status: "false" });
    }

    // Validate if addedBy exists in the user table
    dbConfig.query('SELECT userId FROM user WHERE userId = ?', [addedBy], (err, userResults) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ error: 'Invalid addedBy userId', status: "false" });
        }

        // Get current timestamp in Indian Standard Time (IST)
        const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

        // SQL query to insert a new post with createdDate and addedBy, including the photo field
        const query = `
            INSERT INTO post
            (title, description, createdDate, photo, addedBy)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [title, description, createdDate, photo, addedBy];

        dbConfig.query(query, values, (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully added new post
            res.status(201).json({ message: 'Post added successfully', status: "true", postId: results.insertId });
        });
    });
});

// router.put('/editpost/:postId', upload, (req, res) => {
//     // Handle file upload errors
//     if (err instanceof multer.MulterError) {
//         return res.status(400).json({ error: err.message, status: "false" });
//     } else if (err) {
//         return res.status(500).json({ error: 'File upload failed', status: "false" });
//     }

//     const { postId } = req.params;
//     const { title, description, addedBy } = req.body;
    
//     // Handle new file uploads for photo
//     const newPhoto = req.file ? `uploads/${req.file.filename}` : null;

//     // Validate inputs
//     if (!title || !description || !addedBy) {
//         return res.status(400).json({ error: 'All fields are required', status: "false" });
//     }

//     // Validate if `addedBy` exists in the `user` table
//     dbConfig.query('SELECT userId FROM user WHERE userId = ?', [addedBy], (err, userResults) => {
//         if (err) {
//             return res.status(500).json({ error: err.message });
//         }

//         if (userResults.length === 0) {
//             return res.status(404).json({ error: 'Invalid addedBy userId', status: "false" });
//         }

//         // Fetch existing post to get the current photo
//         dbConfig.query('SELECT photo FROM post WHERE postId = ?', [postId], (err, results) => {
//             if (err) {
//                 return res.status(500).json({ error: err.message });
//             }

//             if (results.length === 0) {
//                 return res.status(404).json({ error: 'Post not found', status: "false" });
//             }

//             // Use existing photo if no new photo is uploaded
//             const existingPhoto = results[0].photo;
//             const photoToStore = newPhoto || existingPhoto;

//             // SQL query to update the post
//             const updateQuery = `
//                 UPDATE post
//                 SET title = ?, description = ?, photo = ?, addedBy = ?, updatedDate = ?
//                 WHERE postId = ?;
//             `;
//             const values = [
//                 title, description, photoToStore, addedBy,
//                 moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), postId
//             ];

//             dbConfig.query(updateQuery, values, (err, updateResults) => {
//                 if (err) {
//                     if (err.code === 'ER_DUP_ENTRY') {
//                         return res.status(400).json({ error: 'A post with this title already exists', status: "false" });
//                     }
//                     return res.status(500).json({ error: err.message });
//                 }

//                 if (updateResults.affectedRows === 0) {
//                     return res.status(404).json({ error: 'Post not found', status: "false" });
//                 }

//                 // Fetch updated post
//                 dbConfig.query('SELECT * FROM post WHERE postId = ?', [postId], (err, fetchResults) => {
//                     if (err) {
//                         return res.status(500).json({ error: err.message });
//                     }

//                     if (fetchResults.length === 0) {
//                         return res.status(404).json({ error: 'Post not found', status: "false" });
//                     }

//                     res.status(200).json({ message: 'Post updated successfully', status: "true", post: fetchResults[0] });
//                 });
//             });
//         });
//     });
// });

router.put('/editpost/:postId',IsUserAuthicated, (req, res) => {
    // Using multer upload function with error handling
    upload(req, res, (err) => {
        // Handle file upload errors
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message, status: "false" });
        } else if (err) {
            return res.status(500).json({ error: 'File upload failed', status: "false" });
        }

        const { postId } = req.params;
        const { title, description, addedBy } = req.body;

        // Handle new file uploads for photo
        const newPhoto = req.file ? `uploads/${req.file.filename}` : null;

        // Validate inputs
        if (!title || !description || !addedBy) {
            return res.status(400).json({ error: 'All fields are required', status: "false" });
        }

        // Validate if `addedBy` exists in the `user` table
        dbConfig.query('SELECT userId FROM user WHERE userId = ?', [addedBy], (err, userResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (userResults.length === 0) {
                return res.status(404).json({ error: 'Invalid addedBy userId', status: "false" });
            }

            // Fetch existing post to get the current photo
            dbConfig.query('SELECT photo FROM post WHERE postId = ?', [postId], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                if (results.length === 0) {
                    return res.status(404).json({ error: 'Post not found', status: "false" });
                }

                // Use existing photo if no new photo is uploaded
                const existingPhoto = results[0].photo;
                const photoToStore = newPhoto || existingPhoto;

                // SQL query to update the post
                const updateQuery = `
                    UPDATE post
                    SET title = ?, description = ?, photo = ?, addedBy = ?, updatedDate = ?
                    WHERE postId = ?;
                `;
                const values = [
                    title, description, photoToStore, addedBy,
                    moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'), postId
                ];

                dbConfig.query(updateQuery, values, (err, updateResults) => {
                    if (err) {
                        if (err.code === 'ER_DUP_ENTRY') {
                            return res.status(400).json({ error: 'A post with this title already exists', status: "false" });
                        }
                        return res.status(500).json({ error: err.message });
                    }

                    if (updateResults.affectedRows === 0) {
                        return res.status(404).json({ error: 'Post not found', status: "false" });
                    }

                    // Fetch updated post
                    dbConfig.query('SELECT * FROM post WHERE postId = ?', [postId], (err, fetchResults) => {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }

                        if (fetchResults.length === 0) {
                            return res.status(404).json({ error: 'Post not found', status: "false" });
                        }

                        res.status(200).json({ message: 'Post updated successfully', status: "true", post: fetchResults[0] });
                    });
                });
            });
        });
    });
});


// Endpoint to soft delete a post
router.put('/deletepost/:postId',IsUserAuthicated, (req, res) => {
    const { postId } = req.params;

    // SQL query to update the post's status to 2 (soft delete)
    const query = `
        UPDATE post
        SET status = 2
        WHERE postId = ?;
    `;
    const values = [postId];

    dbConfig.query(query, values, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if any row was affected
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Post not found', status: "false" });
        }

        // Successfully soft deleted the post
        res.status(200).json({ message: 'Post deleted successfully', status: "true" });
    });
});

// API for changing post status
router.put('/togglepoststatus/:postId', IsUserAuthicated,(req, res) => {
    const { postId } = req.params;

    // SQL query to fetch the current status of the post
    const selectQuery = 'SELECT status FROM post WHERE postId = ?';
    const updateQuery = 'UPDATE post SET status = ? WHERE postId = ?';

    dbConfig.query(selectQuery, [postId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if post exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Post not found', status: "false" });
        }

        const currentStatus = results[0].status;
        const newStatus = currentStatus === 1 ? 0 : 1;

        // Update the status
        dbConfig.query(updateQuery, [newStatus, postId], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Successfully toggled the post status
            res.status(200).json({ message: 'Post status updated successfully', status: "true" });
        });
    });
});

// Endpoint to get posts with pagination, search, and date filtering
router.get('/posts',IsUserAuthicated, (req, res) => {
    const { page = 1, limit = 10, search = '', date = '' } = req.query; // Extract parameters from query
    const offset = (page - 1) * limit;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: 'Invalid page or limit values', status: "false" });
    }

    // Base SQL query
    let selectQuery = `
        SELECT 
            p.postId, 
            p.title, 
            p.description, 
            p.photo, 
            p.createdDate, 
            p.status,
            p.updatedDate, 
            p.addedBy,
            u.firstName AS addedByName
        FROM post p
        LEFT JOIN user u ON p.addedBy = u.userId
        WHERE p.status != 2
        ${search ? `AND (p.title LIKE ? OR p.description LIKE ?)` : ''}
        ${date ? `AND DATE(p.createdDate) = ?` : ''}
        ORDER BY p.postId DESC
        LIMIT ? OFFSET ?
    `;

    // Query values array
    let queryValues = [];
    if (search) {
        queryValues.push(`%${search}%`, `%${search}%`);
    }
    if (date) {
        queryValues.push(date); // Ensure date is in 'YYYY-MM-DD' format
    }
    queryValues.push(parseInt(limit), parseInt(offset));

    // Execute the query to fetch posts
    dbConfig.query(selectQuery, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Query to count the total number of posts based on filters
        let countQuery = `
            SELECT COUNT(*) AS total
            FROM post p
            LEFT JOIN user u ON p.addedBy = u.userId
            WHERE p.status != 2
            ${search ? `AND (p.title LIKE ? OR p.description LIKE ?)` : ''}
            ${date ? `AND DATE(p.createdDate) = ?` : ''}
        `;

        let countQueryValues = [];
        if (search) {
            countQueryValues.push(`%${search}%`, `%${search}%`);
        }
        if (date) {
            countQueryValues.push(date);
        }

        // Execute the count query
        dbConfig.query(countQuery, countQueryValues, (err, countResults) => {
            if (err) {
                return res.status(500).json({ error: err.message, status: "false" });
            }

            const totalItems = countResults[0].total;
            const totalPages = Math.ceil(totalItems / limit);

            // Return the list of posts with pagination metadata
            res.status(200).json({
                status: "true",
                posts: results,
                totalItems,
                totalPages,
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit)
            });
        });
    });
});

// API for post details
router.get('/postdetails/:postId', IsUserAuthicated ,(req, res) => {
    const { postId } = req.params;

    // Validate if postId is provided
    if (!postId) {
        return res.status(400).json({ error: 'Please enter post ID', status: "false" });
    }

    // Query to fetch post details by postId
    const query = 'SELECT * FROM post WHERE postId = ?';

    dbConfig.query(query, [postId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Check if the post exists
        if (results.length === 0) {
            return res.status(404).json({ error: 'Post not found', status: "false" });
        }

        const post = results[0];

        // Successfully retrieved post details
        res.status(200).json({
            message: 'Post Details',
            status: "true",
            post: {
                postId: post.postId,
                title: post.title,
                description: post.description,
                photo: post.photo,          // Main photo
                status: post.status,
                createdDate: post.createdDate,  // Assuming createdDate is used for created time
                updatedDate: post.updatedDate,  // Assuming updatedDate is used for updated time
                addedBy: post.addedBy,
            }
        });
    });
});

// // API to fetch all posts by addedBy (userId)
// router.get('/postsbyuser/:addedBy', (req, res) => {
//     const { addedBy } = req.params;

//     // Validate if addedBy (userId) is provided
//     if (!addedBy) {
//         return res.status(400).json({ error: 'Please provide addedBy (user ID)', status: "false" });
//     }

//     // SQL query to fetch all posts added by the specific user (addedBy)
//     const query = `
//         SELECT 
//             p.postId, 
//             p.title, 
//             p.description, 
//             p.photo, 
//             p.status, 
//             p.createdDate, 
//             p.updatedDate, 
//             p.addedBy 
//         FROM 
//             post p
//         WHERE 
//             p.addedBy = ?;  -- Filter by the addedBy field (which is the userId of the post creator)
//     `;

//     dbConfig.query(query, [addedBy], (err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, status: "false" });
//         }

//         // Check if any posts are found for the given user
//         if (results.length === 0) {
//             return res.status(200).json({ error: 'No posts found for this user', status: "false" });
//         }

//         // Successfully retrieved posts added by the user
//         res.status(200).json({
//             message: 'Posts added by the user',
//             status: "true",
//             posts: results.map(post => ({
//                 postId: post.postId,
//                 title: post.title,
//                 description: post.description,
//                 photo: post.photo,
//                 status: post.status,
//                 createdDate: post.createdDate,
//                 updatedDate: post.updatedDate,
//                 addedBy: post.addedBy
//             }))
//         });
//     });
// });

// API to fetch all posts by addedBy (userId) with search and specific date filter functionality
router.get('/postsbyuser/:addedBy', IsUserAuthicated ,(req, res) => {
    const { addedBy } = req.params;
    const { search = '', date } = req.query;  // Changed 'createdDate' to 'date'

    // Validate if addedBy (userId) is provided
    if (!addedBy) {
        return res.status(400).json({ error: 'Please provide addedBy (user ID)', status: "false" });
    }

    // Base SQL query to fetch all posts added by the specific user (addedBy)
    let query = `
        SELECT 
            p.postId, 
            p.title, 
            p.description, 
            p.photo, 
            p.status, 
            p.createdDate, 
            p.updatedDate, 
            p.addedBy 
        FROM 
            post p
        WHERE 
            p.addedBy = ?  -- Filter by the addedBy field (which is the userId of the post creator)
            ${search ? 'AND (p.title LIKE ? OR p.description LIKE ?)' : ''}  -- Search condition on title and description
            ${date ? 'AND DATE(p.createdDate) = ?' : ''}  -- Exact match for the 'date' parameter
            ORDER BY p.postId DESC
    `;

    // Query parameters array
    let queryValues = [addedBy];
    if (search) {
        queryValues.push(`%${search}%`, `%${search}%`);
    }
    if (date) {
        queryValues.push(date);  // Use 'date' for exact date filtering
    }

    // Execute the query to fetch posts
    dbConfig.query(query, queryValues, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, status: "false" });
        }

        // Check if any posts are found for the given user
        if (results.length === 0) {
            return res.status(200).json({ error: 'No posts found for this user', status: "false" });
        }

        // Successfully retrieved posts added by the user
        res.status(200).json({
            message: 'Posts added by the user',
            status: "true",
            posts: results.map(post => ({
                postId: post.postId,
                title: post.title,
                description: post.description,
                photo: post.photo,
                status: post.status,
                createdDate: post.createdDate,
                updatedDate: post.updatedDate,
                addedBy: post.addedBy
            }))
        });
    });
});


module.exports = router;
