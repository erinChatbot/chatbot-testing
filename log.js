var log = {
    info: function(info) {
        console.log('[INFO] ' + info);
    },
    warning: function(warning) {
        console.log('[WARNING] ' + warning);
    },
    error: function(error) {
        console.log('[ERROR] ' + error);
    },
    debug: function(debug) {
            console.log('[DEBUG] ' + debug);
        },
};

module.exports = log