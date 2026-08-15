const appJson = require('./app.json');

const baseUrl = process.env.WEB_BASE_PATH || '';
const expo = { ...appJson.expo };
if (baseUrl) {
  expo.experiments = { ...(expo.experiments || {}), baseUrl };
}

module.exports = { ...appJson, expo };
