const router = require('express')(); // grab router to set up endpoints
const api = require('../util/system');
const system = require('../util/system');
const BASE_USER_API = '/u/:user_id'; // our base user route

/**
 * Defines the route in which will retrieve all registered users.
 * 
 * Expected Output:
 * {
 *      success: true,
 *      users: [
 *          ... data of all users
 *      ]
 * }
 */
router.get('/', async (req, res) => res.json(await system.getAllUsers()));

/**
 * Defines the router in which will create a new user.
 * 
 * Expected POST data:
 *  username - The username for the new user
 * 
 * Expected Output:
 * {
 *      success: true,
 *      details: {
 *          id,
 *          username
 *      }
 */
router.post('/register', async (req, res) => {
    let username = req.body.username;

    if (username && username.length > 0)
        res.json(await system.createUser(username));
    else
        res.json(system.createError('Please provide a username for the new user!'));
});

/**
 * Defines the base user route that is specific to a user.
 * 
 * Expected Parameters:
 *  {user_id} -> The id of the user
 * 
 * Expected Output:
 * {
 *      success: true,
 *      details: {
 *          ... some user data
 *      }
 * }
 */
router.get(BASE_USER_API, async (req, res) => {
    try {
        let user_id = req.params.user_id;
        res.json(await system.getUser(user_id));
    } catch (e) {
        res.json(system.createError(e.message));
    }
});

/**
 * Defines the upload route in which a registered user will upload an image file to our servers.
 * 
 * Expected POST data:
 *  images - Consisting of one or multile images (up to 5)
 * 
 * Expected Output:
 *  if (# of files > 1)
 *      {
 *          success: true,
 *          files: [
 *              {
 *                  ... some file data
 *              },
 *              ... more file data
 *          ]
 *      }
 *  else if (# of files === 1)
 *      {
 *          success: true,
 *          file: {
 *              ... some file data
 *          }
 *      }
 */
const setting = system.multer.array('photos', 5);
router.post(`${BASE_USER_API}/upload`, async (req, res) => {
    // make sure user is valid first
    let user_id = req.params.user_id;
    let userDetails = await api.getUser(user_id);
    if (!userDetails.success) {
        res.json(userDetails);
        return;
    }

    setting(req, res, async (err) => {
        if (err) {
            res.json(system.createError(err.message));
            return;
        }
        
        // make sure images are provided
        if ((req.files !== undefined) && (req.files.length > 0)) {
            // start uploading each file
            let result = [];
            for (let i = 0; i < req.files.length; i++) {
                let file = req.files[i];

                try {
                    // generate a new id for the file
                    let id = system.generateUID();
                    let url = await system.uploadFile(file, id);

                    // set privacy to public for default
                    await system.addId(id, url, file.originalname, true, user_id);

                    // save the output for later
                    result.push({
                        id,
                        name: file.originalname,
                        link: `./api/images/i/${id}/download`
                    });
                } catch (e) {
                    res.json(system.createError(e.message));
                    return;
                }
            }

            if (result.length === 1)
                res.json(system.createSuccess({ file: result[0] }));
            else
                res.json(system.createSuccess({ files: result }));
        } else {
            res.json(system.createError(`No images provided.`));
        }
    });
});

module.exports = router;