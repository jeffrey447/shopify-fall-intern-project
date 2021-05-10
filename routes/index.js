// set up api routes here
module.exports = [
    {
        path: '/api/images/',
        module: require('./images')
    },
    {
        path: '/api/users/',
        module: require('./users')
    }
];