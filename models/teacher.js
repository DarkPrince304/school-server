var mongoose = require('mongoose');
var Subject = require('./subject');

var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

var TeacherSchema = new Schema({

	name: { type: String, required: true },
	email: { type: String, required: true, index: { unique: true } },
	password: { type: String, required: true },
	subject: { type: String, required: true },
	isClassTeacher: Boolean
});

TeacherSchema.pre('save', function(next) {

	var teacher = this;

	if(!teacher.isModified('password')) return next();

	bcrypt.hash(teacher.password, null, null, function(err, hash) {
		if(err) return next(err);

		teacher.password = hash
		var subject = {}
		subject.name = teacher.subject;
		subject.taughtByName = teacher.name;
		subject.taughtByEmail = teacher.email;
		subject = new Subject(subject);
		subject.save(function(err) {
			if(err){
				res.send(err);
				return;
			}
		})
		next();

	});
});

TeacherSchema.methods.comparePassword = function(password) {
	var teacher = this;

	return bcrypt.compareSync(password, teacher.password);
}

module.exports = mongoose.model('Teacher', TeacherSchema);
