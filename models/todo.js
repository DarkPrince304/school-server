var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var TodoSchema = new Schema({

	subject: { type: String, required: true },
	students: [String],
	time: { type: Date, default: Date.now, required: true }

});

module.exports = mongoose.model('Todo', TodoSchema);
