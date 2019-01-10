module.exports = {
    quickReplies: function(content_type, title, payload) {
        this.content_type = content_type;
        this.title = title;
        this.payload = payload;
    },
}