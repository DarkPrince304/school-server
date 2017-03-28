var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var StudentSchema = new Schema({

	name: { type: String, required: true },
	email: { type: String, required: true, index: { unique: true } },
	password: { type: String, required: true },
	todo: [{ subject: String, status: {type: Number, default: 0}, time: { type: Date, default: Date.now } }],
	subjects: [{ name: String, attendance: { type: Number, default: 0 } }]
});

StudentSchema.pre('save', function(next) {

	var student = this;

	if(!student.isModified('password')) return next();

	bcrypt.hash(student.password, null, null, function(err, hash) {
		if(err) return next(err);

		student.password = hash
		next();

	});
});

StudentSchema.methods.comparePassword = function(password) {
	var student = this;

	return bcrypt.compareSync(password, student.password);
}

module.exports = mongoose.model('Student', StudentSchema);
