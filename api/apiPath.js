'use strict';

let path = {
    // Authenticate
    AUTHENTICATE : '/api/customer/login',
    // Get Customer Status
    GET_CUSTOMER_STATUS : '/api/customer/status?_locale=',
    // Get Campaign Category
    GET_CAMPAIGN_CATEGORY : '/api/campaign_category',
    // Get Campaign By Category
    GET_CAMPAIGN_BY_CATEGORY : '/api/customer/campaign/available?perPage=5&page=1&categoryId[]=',
    // Get Featured Campaign
    GET_FEATURED_CAMPAIGN : '/api/customer/campaign/available?isFeatured=true&perPage=5&page=1',
    // Get Exclusive Campaign
    GET_EXCLUSIVE_CAMPAIGN : '/api/customer/campaign/available?hasSegment=true&perPage=5&page=1',
}

module.exports = Object.freeze(path);