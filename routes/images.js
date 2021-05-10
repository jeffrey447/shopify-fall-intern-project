const router = require('express')(); // grab router to set up endpoints
const system = require('../util/system');
const { storage: s3 } = require('../util/services');

const BASE_IMAGE_API = '/i/:file_id'; // our base image route

/**
 * Defines the route in which will retrieve all (public) uploaded images to the server.
 * 
 * Expected Output:
 * {
 *      success: true,
 *      images: [
 *          ... data of images
 *      ]
 * }
 */
router.get('/', async (req, res) => res.json(await system.getAllIds()));

/**
 * Defines the upload route in which an anonymous user will upload an image file to our servers.
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
router.post('/upload', async (req, res) => {
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
                    await system.addId(id, url, file.originalname, true);

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

// /i/{file_id}/

/**
 * Defines the base image route that is specific to a image.
 * 
 * Expected Parameters:
 *  {file_id} -> The id of the image
 * 
 * Expected Output:
 * {
 *      success: true,
 *      details: {
 *          ... some file data
 *      }
 * }
 */
router.get(BASE_IMAGE_API, async (req, res) => {
    try {
        let file_id = req.params.file_id;
        res.json(await system.getId(file_id));
    } catch (e) {
        res.json(system.createError(e.message));
    }
});

/**
 * Defines the route that will change whether an image is public or not.
 * 
 * Expected POST data:
 *  public - true / false (or if not provided, default to true)
 * 
 * Expected Parameters:
 *  {file_id} -> The id of the image
 * 
 * Expected Output:
 * {
 *      success: true
 * }
 */
router.post(`${BASE_IMAGE_API}/set_public`, async (req, res) => {
    try {
        let file_id = req.params.file_id;
        let file = await system.getId(file_id);
        if (!file.success) {
            res.json(file);
            return;
        }
        
        // retrieve the public field
        let public = req.body.public;
        if (public === undefined) public = null; // by default

        // try to parse, if needed
        if ((public !== null) && (typeof(public) !== 'boolean') && (public !== "true" && public !== "false")) {
            res.json(system.createError(`Invalid "public" value.`));
            return;
        }
        
        if (public === null)
            public = true; // default to public
        else if (typeof(public) !== 'boolean')
            public = (public === 'true');

        res.json(await system.changePublic(file_id, public));
    } catch (e) {
        res.json(system.createError(e.message));
    }
});

/**
 * Defines the base image route in which a user can request to delete the specified image.
 * 
 * Expected Parameters:
 *  {file_id} -> The id of the image
 * 
 * Expected Output:
 * {
 *      success: true
 * }
 */
router.delete(BASE_IMAGE_API, async (req, res) => {
    try {
        let file_id = req.params.file_id;
        let file = await system.getId(file_id);
        if (!file.success) {
            res.json(file);
            return;
        }

        // remove from our databases
        let deleteFile = await system.deleteId(file_id);
        if (!deleteFile.success) {
            res.json(deleteFile);
            return;
        }

        // tell our aws s3 servers to delete the given file
        await s3.deleteObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `images/${file_id}-${file.details.name}`
        });

        res.json(system.createSuccess());
    } catch (e) {
        res.json(system.createError(e.message));
    }
});

/**
 * Defines the download route where a user can download the requested image.
 * 
 * Expected Parameters:
 *  {file_id} -> The id of the image
 */
router.get(`${BASE_IMAGE_API}/download`, async (req, res) => {
    try {
        let file_id = req.params.file_id;
        let file = await system.getId(file_id);
        if (!file.success) {
            res.json(file);
            return;
        }

        // cannot download because private :(
        if (!file.details.public) {
            res.json(system.createError(`Cannot download file "${file_id}": invalid permissions.`));
            return;
        }

        // increase the download counter
        await system.incrementDownloadCounter(file_id);
        
        // retrieve the file from s3 servers then allow the user to download
        let fileStream = s3.getObject({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `images/${file_id}-${file.details.name}`
        }).createReadStream();
        res.attachment(file.details.name);
        fileStream.pipe(res);
    } catch (e) {
        res.json(system.createError(e.message));
    }
});

module.exports = router;