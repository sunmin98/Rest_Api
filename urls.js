const { google } = require('googleapis');
const OAuth2Client = google.auth.OAuth2Client;


const oAuth2Client = new OAuth2Client(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

// 인증 URL 생성
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
});

console.log('Authorize this app by visiting this url:', authUrl);