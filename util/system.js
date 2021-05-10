const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { database: db, storage: s3 } = require('./services');

// define our upload settings (can define more limits like file size, etc...)
const upload = multer({
    dest: './temp_uploads',
    fileFilter: (req, file, callback) => {
        let ext = path.extname(file.originalname);
        if(ext !== '.png' && ext !== '.jpg' && ext !== '.gif' && ext !== '.jpeg') {
            callback(new Error('Only images are allowed.'), false);
            return;
        }
        
        callback(null, true);
    },
    /* limits: {
        fileSize: 1024 * 1024
    } */
});

const api = {
    multer: upload,
    /**
     * Creates a dictionary containing error data.
     * @param {String} message The error message.
     * @param {*} data Any data relevant to this error.
     * @returns A dictionary containing the failed success, message, and any provided error data.
     */
    createError: (message, data) => {
        return {
            success: false,
            message,
            ...data
        };
    },
    /**
     * Creates a dictionary containing data relevant to the success.
     * @param {*} data Any data relevant to this success.
     * @returns A dictionary containing the success and any provided data relevant to this success.
     */
    createSuccess: (data) => {
        return {
            success: true,
            ...data
        };
    },
    /**
     * Generates a short unique id.
     * @returns {String} A unique id.
     */
    generateUID: () => {
        let firstPart = (Math.random() * 46656) | 0;
        firstPart = ('000' + firstPart.toString(36)).slice(-3);

        let secondPart = (Math.random() * 46656) | 0;
        secondPart = ('000' + secondPart.toString(36)).slice(-3);

        return firstPart + secondPart;
    },
    /**
     * Uploads a given file to Amazon S3 servers.
     * @param {Express.Multer.File} file The file to upload.
     * @param {String} id The unique id mapping to this new file.
     * @returns {Promise<String>} A promise that will eventually return the new download link of the file.
     */
    uploadFile: (file, id) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject('No image file uploaded.');
                return;
            }
    
            // upload to our s3 server!
            s3.upload({
                ACL: 'public-read',
                Bucket: process.env.AWS_BUCKET_NAME,
                Body: fs.createReadStream(file.path),
                Key: `images/${id}-${file.originalname}`
            }, (err, data) => {
                if (err) {
                    reject(err.message);
                    return;
                }
    
                if (data) {
                    fs.unlinkSync(file.path); // delete temp file now that it's in our cloud storage
                    resolve(data.Location);
                }
            });
        });
    },
    /**
     * Adds a new image to the database.
     * @param {String} id The unique id of the image.
     * @param {String} url The direct download link (from Amazon S3) of the image.
     * @param {String} name The name of the image.
     * @param {Boolean} public Whether the image is public or not.
     * @param {String} user_id (optional) The id of the user trying to upload this image.
     * @returns A success (or failure) of the operation.
     */
    addId: async (id, url, name, public, user_id = null) => {
        try {
            let ref = db.ref(`images/${id}`);
            await ref.set({
                link: url,
                name,
                id,
                public,
                user_id,
                downloads: 0
            });
            
            return api.createSuccess();
        } catch (e) {
            return api.createError(e.message);
        }
    },
    /**
     * Retrieves the details of a specified image from the database.
     * @param {String} id The unique id of an image.
     * @returns Details of the specified image.
     */
    getId: async (id) => {
        let ref = db.ref(`images/${id}`);
        try {
            let result = await ref.once('value');
            if (result.exists()) {
                let details = result.val();
                details.link = undefined; // omit direct download link
                
                return api.createSuccess({ details });
            } else {
                return api.createError(`File with id "${id}" does not exist.`);
            }
        } catch (e) {
            return api.createError(e.message);
        }
    },
    /**
     * Deletes the specified image from the database.
     * @param {String} id The unique id of an image.
     * @returns A success (or failure) of the operation.
     */
    deleteId: async(id) => {
        let ref = db.ref(`images/${id}`);
        try {
            let file = await api.getId(id);
            if (!file.success) return file;

            await ref.remove();
            return api.createSuccess();
        } catch (e) {
            return api.createError(e.message);
        }
    },
    /**
     * Retrieves all (public) images.
     * @returns A list containing data of all (public) images.
     */
    getAllIds: async () => {
        let ref = db.ref('images');
        let result = await ref.once('value');
        if (!result.exists()) return api.createSuccess({ images: [] }); // no files uploaded!

        let images = [];
        for (let [name, data] of Object.entries(result.val())) {
            if (!data.public) continue; // ignore private images
            data.link = undefined; // omit direct download link
            images.push(data);
        }
        
        return api.createSuccess({ images });
    },
    /**
     * Increments the download counter of a specified image.
     * @param {*} id The unique id of the image.
     * @returns A success (or failure) of the operation.
     */
     incrementDownloadCounter: async (id) => {
        let ref = db.ref(`images/${id}`);
        try {
            let file = await api.getId(id);
            if (!file.success) return file;
            
            let result = await ref.once('value');
            let data = result.val();
            data.downloads = (data.downloads) || 0; // in case it was never defined

            await ref.update({ downloads: (data.downloads + 1) || 1 });
            return api.createSuccess();
        } catch (e) {
            return api.createError(e.message);
        }
    },
    /**
     * Changes the "public" setting of a specified image.
     * @param {String} id The unique id of an image.
     * @param {Boolean} public Whether the image is public or not.
     * @returns A success (or failure) of the operation.
     */
    changePublic: async (id, public) => {
        let ref = db.ref(`images/${id}`);
        try {
            let file = await api.getId(id);
            if (!file.success) return file;

            await ref.update({ public });
            return api.createSuccess();
        } catch (e) {
            return api.createError(e.message);
        }
    },
    /**
     * Retrieves all users from the database.
     * @returns A list of all users.
     */
    getAllUsers: async () => {
        let ref = db.ref('users');
        let result = await ref.once('value');
        if (!result.exists()) return api.createSuccess({ users: [] }); // no users!

        let users = [];
        for (let [name, data] of Object.entries(result.val()))
            users.push(data);
        
        return api.createSuccess({ users });
    },
    /**
     * Retrieves details of a user from their unique id.
     * @param {String} id The user's unique id.
     * @returns The details of a specified user.
     */
    getUser: async (id) => {
        let ref = db.ref(`users/${id}`);
        try {
            let result = await ref.once('value');
            if (result.exists()) {
                let details = result.val();
                details.images = [];

                // retrieve the uploaded images of this user to display
                let images = (await api.getAllIds()).images;
                images.forEach(img => {
                    if (img.user_id === id) {
                        img.link = undefined; // omit download link
                        details.images.push(img);
                    }
                });

                return api.createSuccess({ details });
            } else {
                return api.createError(`User with id "${id}" does not exist.`);
            }
        } catch (e) {
            return api.createError(e.message);
        }
    },
    /**
     * Creates a new user with the given username and unique id.
     * @param {String} id The id of the new user.
     * @param {String} username The username of the new user.
     * @returns The new data for the user.
     */
    createUser: async (username) => {
        // generate random id for the new user
        let id = api.generateUID();

        // make sure the username is not taken as well
        let userList = await api.getAllUsers();
        for (let i = 0; i < userList.users.length; i++) {
            let user = userList.users[i];
            if (user.username.toLowerCase() === username.toLowerCase())
                return api.createError(`User with username "${username}" already exists!`);
        }
        
        // now we can proceed with creating the user in our database
        try {
            let ref = db.ref(`users/${id}`);
            let data = {
                id,
                username
            };

            await ref.set(data);
            return api.createSuccess({ details: data });
        } catch (e) {
            return api.createError(e.message);
        }
    }
};

module.exports = api;