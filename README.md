
# Shopify Fall 2021 Intern Challenge

Task: **To build a simple image repository.**
Created by: **Jeffrey Ha** ([LinkedIn](https://www.linkedin.com/in/hajeffrey/), [Github](https://github.com/jeffrey447), [Devpost](https://devpost.com/jeffrey447))
Technologies used: **Node.js, Express.js, Firebase, Amazon S3, Multer, Mocha Chai**

Features
 1. Upload images (up to 5) as either anonymous or registered user.
 2. Delete image
 3. Download image
 4. View specific image or all images
 5. Create user
 6. View user or all created users

Setup
 1. Create an **.env file** (template given below).
 2. Create a **.credentials** file under **C:\Users\{user}\.aws\** (template given below).
 3. Run **npm install** in the root directory of the folder.

To run the project, run **npm start**. It will create a web server under the port 5000, assuming it is available.

To run the tests for this project... *(has a default 10,000 ms timeout)*
 1. Ensure that the server is running already (run **npm start**) in a separate command line interface.
 2. In another command line interface, run **npm test** to execute all tests.

All API Routes
 1. GET /api/images/ - Retrieves all uploaded **(public)** images.
 2. POST /api/images/upload - Uploads one or more (up to 5) images to the server.
 3. GET /api/images/i/{IMAGE_ID}/ - Retrieves information of the image.
 4. DELETE /api/images/i/{IMAGE_ID} - Deletes the image from the server.
 5. POST /api/images/i/{IMAGE_ID}/set_public - Updates whether the image is "public" or not.
 6. GET /api/images/i/{IMAGE_ID}/download - Downloads the specified image, assuming it is **public**.
 7. GET /api/users/ - Retrieves all registered users.
 8. POST /api/users/register - Registers a new user in the database.
 9. GET /api/users/u/{USER_ID}/ - Retrieves information of the user (as well as their uploaded [public] images).
 10. POST /api/users/u/{USER_ID}/upload - Uploads one or more (up to 5) images to the server under this user's id.