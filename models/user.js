const mongoose = require('mongoose');
const schema = mongoose.Schema;
const userSchema = new schema({
    name: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    filecount:{
       type: Number
    },
    filedata: [{
        fname: String,
        srcsite: String,
        tabsite: String
    }]
},{strict: false});
const user = mongoose.model('user',userSchema);

module.exports = user;