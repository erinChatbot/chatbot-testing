module.exports = {
    CampaignBtn: function(buttons) {
        this.buttons = buttons
    },

    BtnContent: function(type,title,url) {
        this.type = type;
        this.title = title;
        this.url = url;
    },

    Campaign: function(title,image_url,buttons) {
        this.title = title;
        this.image_url = image_url;
        this.buttons = buttons;
    },
};