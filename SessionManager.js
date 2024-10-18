const crypto = require('crypto');

class SessionError extends Error {};

function SessionManager (){
    // default session length - you might want to
    // set this to something small during development
    const CookieMaxAgeMs = 600000;

    // keeping the session data inside a closure to keep them protected
    const sessions = {};

    // might be worth thinking about why we create these functions
    // as anonymous functions (per each instance) and not as prototype methods
    this.createSession = (response, username, maxAge = CookieMaxAgeMs) => {
        /* To be implemented */
        var randomString = crypto.randomBytes(32).toString("hex");
        sessions[randomString] = {username: username, timestamp: Date.now(), expire_timestamp: (Date.now() + maxAge)};
        response.cookie("cpen322-session", randomString, {maxAge : maxAge});
        setTimeout(function(){
            delete(sessions[randomString]);
        }, maxAge);
    };

    this.deleteSession = (request) => {
        /* To be implemented */
        delete sessions[request.session];
        delete request.username
        delete request.session;
    };

    this.middleware = (request, response, next) => {
        /* To be implemented */
        let cookie = request.headers['cookie'];
        if (cookie == null) {
            next(new SessionError("There is no cookie in the header"));
        } else {
            cookie = cookie.split(';').map(s => s.split('=').pop().trim()).shift();
            if (sessions[cookie] == null){
                next(new SessionError("The cookie is not in sessions"));
            } else {
                let cookieInSessions = sessions[cookie];
                request.username = cookieInSessions.username;
                request.session = cookie;
                next();
            }
        }
    };



    // this function is used by the test script.
    // you can use it if you want.
    this.getUsername = (token) => ((token in sessions) ? sessions[token].username : null);
};

// SessionError class is available to other modules as "SessionManager.Error"
SessionManager.Error = SessionError;

module.exports = SessionManager;