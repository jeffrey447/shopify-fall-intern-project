const app = require('express')(); // set up web server

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// default page
app.get('/', (req, res) => res.send("Shopify's Fall 2021 Intern Challenge! :)"));

// set up the API routes
require('./routes').forEach(api => app.use(api.path, api.module));

const port = (process.env.PORT || 5000);
app.listen(port, () => console.log(`Web server started on port ${port}.`));