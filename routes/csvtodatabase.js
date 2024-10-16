const express = require('express');
const router = express.Router();
const multer = require('multer');
const moment = require('moment-timezone');
const csvParser = require('csv-parser');
const fs = require('fs');
const dbConfig = require("./dbconfig");
const upload = multer({ dest: 'uploads/' }).single('csvFile');


// Endpoint to handle CSV file upload and user data insertion
router.post('/addusersfromcsv', (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Validate if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Array to store parsed user data
        const users = [];

        // Parse CSV file
        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => {
                // Prepare user object from CSV data
                const user = {
                    firstName: data.firstName,
                    // lastName: data.lastName,
                    contactNumber: data.contactNumber,
                    // email: data.email,
                    // age: data.age,
                    // education: data.education,
                    // address: data.address,
                    // countryId: data.countryId,
                    // stateId: data.stateId,
                    // cityId: data.cityId,
                    userType: "family head"
                };
                users.push(user);
            })
            .on('end', async () => {
                try {
                    // Remove the uploaded file after parsing
                    fs.unlinkSync(req.file.path);

                    // Get current timestamp in Indian Standard Time (IST)
                    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                    // Check and insert users into the database
                    const insertPromises = users.map(async (user) => {
                        return new Promise((resolve, reject) => {
                            // Check if the contact number already exists
                            const checkQuery = `SELECT COUNT(*) AS count FROM user WHERE contactNumber = ?`;
                            dbConfig.query(checkQuery, [user.contactNumber], (err, results) => {
                                if (err) {
                                    console.error('Error checking contact number:', err);
                                    reject(err);
                                    return;
                                }

                                // If contact number already exists, skip insertion
                                if (results[0].count > 0) {
                                    console.log(`Contact number ${user.contactNumber} already exists. Skipping.`);
                                    resolve(); // Resolve the promise without doing anything
                                    return;
                                }

                                // Otherwise, insert the new user
                                const insertQuery = `
                                    INSERT INTO user 
                                    (firstName, contactNumber, createdDate, userType) 
                                    VALUES (?, ?, ?, ?)
                                `;
                                const values = [
                                    user.firstName,
                                    // user.lastName,
                                    user.contactNumber,
                                    // user.email,
                                    createdDate,
                                    user.userType
                                ];

                                dbConfig.query(insertQuery, values, (err, results) => {
                                    if (err) {
                                        console.error('Error inserting user:', err);
                                        reject(err);
                                    } else {
                                        resolve(results);
                                    }
                                });
                            });
                        });
                    });

                    // Execute all insert queries concurrently
                    await Promise.all(insertPromises);

                    res.status(201).json({ message: 'Users added successfully from CSV', status: 'true' });
                } catch (error) {
                    console.error('Error processing CSV and inserting users:', error);
                    res.status(500).json({ error: 'Failed to process CSV and insert users', status: 'false' });
                }
            });
    });
});


// Endpoint to handle CSV file upload and user data insertion with parentId
router.post('/addusersfromcsvbyId', (req, res) => {
    const { parentId } = req.query;

    // Validate the parentId
    if (!parentId) {
        return res.status(400).json({ error: 'parentId query parameter is required' });
    }

    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Validate if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Array to store parsed user data
        const users = [];

        // Parse CSV file
        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => {
                // Prepare user object from CSV data
                const user = {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    contactNumber: data.contactNumber,
                    email: data.email,
                    userType: "family head",  // Or use data.userType if this comes from CSV
                    parentId: parentId        // Attach the parentId to the user object
                };
                users.push(user);
            })
            .on('end', async () => {
                try {
                    // Remove the uploaded file after parsing
                    fs.unlinkSync(req.file.path);

                    // Get current timestamp in Indian Standard Time (IST)
                    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                    // Check for existing contactNumbers and filter out duplicates
                    const contactNumbers = users.map(user => user.contactNumber);
                    const existingNumbers = await new Promise((resolve, reject) => {
                        const query = 'SELECT contactNumber FROM user WHERE contactNumber IN (?)';
                        dbConfig.query(query, [contactNumbers], (err, results) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve(results.map(row => row.contactNumber));
                        });
                    });

                    // Filter out users with existing contactNumbers
                    const newUsers = users.filter(user => !existingNumbers.includes(user.contactNumber));

                    if (newUsers.length === 0) {
                        return res.status(200).json({ message: 'All records already exist', status: 'true' });
                    }

                    // Insert new users into the database
                    const promises = newUsers.map(user => {
                        return new Promise((resolve, reject) => {
                            const query = `
                                INSERT INTO user 
                                (firstName, lastName, contactNumber, email, createdDate, userType, parentId) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `;
                            const values = [
                                user.firstName,
                                user.lastName,
                                user.contactNumber,
                                user.email,
                                createdDate,
                                user.userType,
                                user.parentId
                            ];

                            dbConfig.query(query, values, (err, results) => {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(results);
                            });
                        });
                    });

                    // Execute all insert queries concurrently
                    await Promise.all(promises);

                    res.status(201).json({ message: 'Users added successfully from CSV with parentId', status: 'true', skipped: existingNumbers.length });
                } catch (error) {
                    console.error('Error processing CSV and inserting users:', error);
                    res.status(500).json({ error: 'Failed to process CSV and insert users', status: 'false' });
                }
            });
    });
});



// Endpoint to handle CSV file upload and event data insertion
router.post('/addeventsfromcsv', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const events = [];

        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => {
                const event = {
                    name: data.name,
                    type: data.type,
                    date: data.date,
                    description: data.description
                    // status: data.status
                };
                events.push(event);
            })
            .on('end', async () => {
                try {
                    fs.unlinkSync(req.file.path);
                    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                    const promises = events.map(event => {
                        return new Promise((resolve, reject) => {
                            const query = `
                                INSERT INTO events 
                                (name, type, date, description, createdDate) 
                                VALUES (?, ?, ?, ?, ?)
                            `;
                            const values = [
                                event.name,
                                event.type,
                                event.date,
                                event.description,
                                // event.status,
                                createdDate
                            ];

                            dbConfig.query(query, values, (err, results) => {
                                if (err) {
                                    console.error('Error inserting event:', err);
                                    reject(err);
                                } else {
                                    resolve(results);
                                }
                            });
                        });
                    });

                    await Promise.all(promises);

                    res.status(201).json({ message: 'Events added successfully from CSV', status: 'true' });
                } catch (error) {
                    console.error('Error processing CSV and inserting events:', error);
                    res.status(500).json({ error: 'Failed to process CSV and insert events', status: 'false' });
                }
            });
    });
});

// Endpoint to upload CSV file and add family members
router.post('/addfamilymembersfromcsv', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const familyMembers = [];

        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => {
                const member = {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    contactNumber: data.contactNumber,
                    email: data.email,
                    age: data.age,
                    education: data.education,
                    address: data.address,
                    countryId: data.countryId,
                    stateId: data.stateId,
                    cityId: data.cityId,
                    userId: data.userId,
                    userType: data.userType
                };
                familyMembers.push(member);
            })
            .on('end', async () => {
                try {
                    fs.unlinkSync(req.file.path);
                    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                    const promises = familyMembers.map(member => {
                        return new Promise((resolve, reject) => {
                            const query = `
                                INSERT INTO familydetails 
                                (firstName, lastName, contactNumber, email, age, education, address, countryId, stateId, cityId, createdDate, userId, userType) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `;
                            const values = [
                                member.firstName,
                                member.lastName,
                                member.contactNumber,
                                member.email,
                                member.age,
                                member.education,
                                member.address,
                                member.countryId,
                                member.stateId,
                                member.cityId,
                                createdDate,
                                member.userId,
                                member.userType
                            ];

                            dbConfig.query(query, values, (err, results) => {
                                if (err) {
                                    console.error('Error inserting family member:', err);
                                    reject(err);
                                } else {
                                    resolve(results);
                                }
                            });
                        });
                    });

                    await Promise.all(promises);

                    res.status(201).json({ message: 'Family members added successfully from CSV', status: 'true' });
                } catch (error) {
                    console.error('Error processing CSV and inserting family members:', error);
                    res.status(500).json({ error: 'Failed to process CSV and insert family members', status: 'false' });
                }
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                res.status(500).json({ error: 'Failed to read CSV file', status: 'false' });
            });
    });
});

// Endpoint to handle CSV file upload and add announcements
router.post('/addannouncementsfromcsv', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const announcements = [];

        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => {
                const announcement = {
                    announcementTitle: data.announcementTitle,
                    announcementType: data.announcementType,
                    announcementDate: data.announcementDate,
                    announcementDescription: data.announcementDescription
                };
                announcements.push(announcement);
            })
            .on('end', async () => {
                try {
                    fs.unlinkSync(req.file.path);
                    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                    const promises = announcements.map(announcement => {
                        return new Promise((resolve, reject) => {
                            const query = `
                                INSERT INTO announcements 
                                (announcementTitle, announcementType, announcementDate, announcementDescription, createdDate) 
                                VALUES (?, ?, ?, ?, ?)
                            `;
                            const values = [
                                announcement.announcementTitle,
                                announcement.announcementType,
                                announcement.announcementDate,
                                announcement.announcementDescription,
                                createdDate
                            ];

                            dbConfig.query(query, values, (err, results) => {
                                if (err) {
                                    console.error('Error inserting announcement:', err);
                                    reject(err);
                                } else {
                                    resolve(results);
                                }
                            });
                        });
                    });

                    await Promise.all(promises);

                    res.status(201).json({ message: 'Announcements added successfully from CSV', status: 'true' });
                } catch (error) {
                    console.error('Error processing CSV and inserting announcements:', error);
                    res.status(500).json({ error: 'Failed to process CSV and insert announcements', status: 'false' });
                }
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                res.status(500).json({ error: 'Failed to read CSV file', status: 'false' });
            });
    });
});

// Endpoint to handle CSV file upload and add magazines
router.post('/addmagazinesfromcsv', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const magazines = [];

        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => {
                const magazine = {
                    title: data.title,
                    description: data.description,
                    magazine: data.magazine
                };
                magazines.push(magazine);
            })
            .on('end', async () => {
                try {
                    fs.unlinkSync(req.file.path);
                    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                    const promises = magazines.map(magazine => {
                        return new Promise((resolve, reject) => {
                            const query = `
                                INSERT INTO magazine 
                                (title, description, magazine, createdDate) 
                                VALUES (?, ?, ?, ?)
                            `;
                            const values = [
                                magazine.title,
                                magazine.description,
                                magazine.magazine,
                                createdDate
                            ];

                            dbConfig.query(query, values, (err, results) => {
                                if (err) {
                                    console.error('Error inserting magazine:', err);
                                    reject(err);
                                } else {
                                    resolve(results);
                                }
                            });
                        });
                    });

                    await Promise.all(promises);

                    res.status(201).json({ message: 'Magazines added successfully from CSV', status: 'true' });
                } catch (error) {
                    console.error('Error processing CSV and inserting magazines:', error);
                    res.status(500).json({ error: 'Failed to process CSV and insert magazines', status: 'false' });
                }
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                res.status(500).json({ error: 'Failed to read CSV file', status: 'false' });
            });
    });
});


// Endpoint to handle CSV file upload and add matrimonial profiles
router.post('/addmatrimonialsfromcsv', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const matrimonials = [];

        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => {
                const matrimonial = {
                    contactNumber: data.contactNumber,
                    // biodata: data.biodata,
                    firstName: data.firstName,
                    middleName: data.middleName || null,
                    lastName: data.lastName,
                    // age: data.age,
                    // profilePic: data.profilePic || null,
                    dateOfBirth: data.dateOfBirth
                };
                matrimonials.push(matrimonial);
            })
            .on('end', async () => {
                try {
                    fs.unlinkSync(req.file.path);
                    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                    const promises = matrimonials.map(matrimonial => {
                        return new Promise((resolve, reject) => {
                            const query = `
                                INSERT INTO matrimonialprofiles 
                                (contactNumber, createdDate, updatedDate, firstName, middleName, lastName, dateOfBirth) 
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `;
                            const values = [
                                matrimonial.contactNumber,
                                // matrimonial.biodata,
                                createdDate,
                                createdDate, // Initialize updatedDate with the same value as createdDate
                                matrimonial.firstName,
                                matrimonial.middleName,
                                matrimonial.lastName,
                                // matrimonial.age,
                                // matrimonial.profilePic,
                                matrimonial.dateOfBirth
                            ];

                            dbConfig.query(query, values, (err, results) => {
                                if (err) {
                                    console.error('Error inserting matrimonial profile:', err);
                                    reject(err);
                                } else {
                                    resolve(results);
                                }
                            });
                        });
                    });

                    await Promise.all(promises);

                    res.status(201).json({ message: 'Matrimonial profiles added successfully from CSV', status: 'true' });
                } catch (error) {
                    console.error('Error processing CSV and inserting matrimonial profiles:', error);
                    res.status(500).json({ error: 'Failed to process CSV and insert matrimonial profiles', status: 'false' });
                }
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                res.status(500).json({ error: 'Failed to read CSV file', status: 'false' });
            });
    });
});

// Endpoint to handle CSV file upload and add forums
router.post('/addforumsfromcsv', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const forums = [];

        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => {
                const forum = {
                    userId: data.userId,
                    forumCategoryId: data.forumCategoryId,
                    title: data.title,
                    description: data.description
                };
                forums.push(forum);
            })
            .on('end', async () => {
                try {
                    fs.unlinkSync(req.file.path);
                    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                    const promises = forums.map(forum => {
                        return new Promise((resolve, reject) => {
                            const query = `
                                INSERT INTO forums 
                                (userId, forumCategoryId, title, description, createdDate, updatedDate) 
                                VALUES (?, ?, ?, ?, ?, ?)
                            `;
                            const values = [
                                forum.userId,
                                forum.forumCategoryId,
                                forum.title,
                                forum.description,
                                createdDate,
                                createdDate // Initialize updatedDate with the same value as createdDate
                            ];

                            dbConfig.query(query, values, (err, results) => {
                                if (err) {
                                    console.error('Error inserting forum:', err);
                                    reject(err);
                                } else {
                                    resolve(results);
                                }
                            });
                        });
                    });

                    await Promise.all(promises);

                    res.status(201).json({ message: 'Forums added successfully from CSV', status: 'true' });
                } catch (error) {
                    console.error('Error processing CSV and inserting forums:', error);
                    res.status(500).json({ error: 'Failed to process CSV and insert forums', status: 'false' });
                }
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                res.status(500).json({ error: 'Failed to read CSV file', status: 'false' });
            });
    });
});

// Endpoint to handle CSV file upload and add business connections
router.post('/addbusinessesfromcsv', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ error: err.message });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const businesses = [];

        fs.createReadStream(req.file.path)
            .pipe(csvParser())
            .on('data', (data) => {
                const business = {
                    userId: data.userId,
                    businessType: data.businessType,
                    businessTitle: data.businessTitle,
                    contactNumber: data.contactNumber,
                    address: data.address,
                    countryId: data.countryId,
                    stateId: data.stateId,
                    cityId: data.cityId
                };
                businesses.push(business);
            })
            .on('end', async () => {
                try {
                    fs.unlinkSync(req.file.path);
                    const createdDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

                    const promises = businesses.map(business => {
                        return new Promise((resolve, reject) => {
                            const query = `
                                INSERT INTO businessconnect
                                (userId, businessType, businessTitle, contactNumber, address, countryId, stateId, cityId, createdDate, updatedDate)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `;
                            const values = [
                                business.userId,
                                business.businessType,
                                business.businessTitle,
                                business.contactNumber,
                                business.address,
                                business.countryId,
                                business.stateId,
                                business.cityId,
                                createdDate,
                                createdDate // Initialize updatedDate with the same value as createdDate
                            ];

                            dbConfig.query(query, values, (err, results) => {
                                if (err) {
                                    console.error('Error inserting business connection:', err);
                                    reject(err);
                                } else {
                                    resolve(results);
                                }
                            });
                        });
                    });

                    await Promise.all(promises);

                    res.status(201).json({ message: 'Business connections added successfully from CSV', status: 'true' });
                } catch (error) {
                    console.error('Error processing CSV and inserting business connections:', error);
                    res.status(500).json({ error: 'Failed to process CSV and insert business connections', status: 'false' });
                }
            })
            .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                res.status(500).json({ error: 'Failed to read CSV file', status: 'false' });
            });
    });
});

module.exports = router;
