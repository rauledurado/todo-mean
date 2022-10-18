// this file will handle connection logic to mongoDB database

const mongoose = require('mongoose');


mongoose.set('useFindAndModify', false);

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1:27017/TaskManager', { useNewUrlParser: true }).then(() => {
    console.log('Connected to MongoDB seccessfully :)');
}).catch((e) => {
    console.log('Error while attempting to connect to MongoDB');
    console.log(e);
});


mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);

module.exports = {
    mongoose
};