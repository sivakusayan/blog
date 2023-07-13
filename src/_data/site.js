require('dotenv').config()

module.exports = {
    url: process.env.ELEVENTY_ENV === 'development' ? 'http://localhost:8080' : 'https://sayansivakumaran.com'
};