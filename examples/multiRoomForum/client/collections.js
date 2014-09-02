var kaskade = require('../../../lib/client/kaskade-client');
var self = module.exports;

self.Users = new kaskade.data.Collection({
    name: 'Users',
    keyField: 'user_id'
});

self.Rooms = new kaskade.data.Collection({
    name: 'Rooms',
    keyField: 'room_id'
});

self.Messages = new kaskade.data.Collection({
    name: 'Messages',
    keyField: 'message_id'
});