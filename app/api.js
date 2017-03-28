var jsonwebtoken = require('jsonwebtoken');
var config = require('../config');
var Student = require('../models/student');
var Teacher = require('../models/teacher');
var Subject = require('../models/subject');
var Todo = require('../models/todo');
var secretKey = config.secretKey;

function createToken(user, isStudent) {
	var token = jsonwebtoken.sign({
		id: user._id,
		name: user.name,
		email: user.email,
		isStudent: isStudent
	}, secretKey, {
		expiresIn: "10m"
	});
	return token;
}

module.exports = function(app, express) {

	var api = express.Router();

	function checkTypeOfUser(req, res, next) {
		var user = req.body;
		if("subject" in user || user.isStudent === false) {
			req.user = new Teacher(req.body);
			req.schema = Teacher;
		} else if("subjects" in user || user.isStudent === true) {
			req.user = new Student(req.body);
			req.schema = Student;
		}
		next();
	}

	api.post('/signup', checkTypeOfUser, function(req, res) {
		var user = req.user;

		user.save(function(err) {
			if(err) {
				res.send(err);
				return;
			}
			return res.json({message: 'User has been created'});
		})
	});

	api.post('/login', checkTypeOfUser, function(req, res) {
		var user = req.user;
		var Schema = req.schema;
		var isStudent = req.body.isStudent;
		Schema.findOne({email: req.body.email}).select('name email password').exec(function( err, user) {
			if(err){
				throw err;
			}

			if(!user) {
				res.send({message: "User doesn't exist"});
			} else if (user) {
				var validPassword = user.comparePassword(req.body.password);
				if(!validPassword) {
					res.send({ message: "Invalid Password"});
				} else {
					var token = createToken(user, isStudent);
					res.json({
						success: true,
						message: "Logged in Succesfully",
						token: token
					})
				}
			}
		});
	});


	api.get('/subjects', function(req, res) {
		Subject.find({}, function(err, subjects) {
			if(err) {
				res.send(err);
				return;
			}
			res.json({subjects: subjects});
		})
	});

	api.use(function(req, res, next) {

		var token = req.body.token || req.params.token || req.headers['x-access-token'] || req.headers.token;
		if( token ) {
			jsonwebtoken.verify(token, secretKey, function( err, decoded) {
				if(err) {
					res.status(403).send({ success: false, message: "Failed to authenticate"});
				} else {
					req.decoded = decoded;
					next();
				}
			});
		} else {
			res.status(403).send({ success: false, message: "No token Provided"});
		}
	});

	api.get('/mySubjects', function(req, res) {
		var userId = req.decoded.id;
		Student.findOne({_id: userId}).select("subjects").exec(function(err, result) {
			if(err) {
				res.send(err);
				return;
			}
			res.json({subjects: result});
		});
	});

	api.get('/myTodo', function(req, res) {
		var userId = req.decoded.id;
		Student.findOne({_id: userId}).select("todo").exec(function(err, result) {
			if(err) {
				res.send(err);
				return;
			}
			res.json({todos: result});
		});
	})

	api.put('/myTodo', function(req, res) {
		var userId = req.decoded.id;
		Student.findByIdAndUpdate(userId, {$push: {todo: req.body}}, {'new': true}, function(err, result) {
			if(err) {
				res.send(err);
				return;
			}
			res.json({message: "Todo updated!"})
		})
	})

	api.get('/sharedTodo', function(req, res) {
		Todo.find({}, function(err, sharedTodo) {
			if(err) {
				res.send(err);
				return;
			}
			res.json({sharedTodo: sharedTodo})
		});
	});

	api.put('/sharedTodo/:id', function(req, res) {
		var isStudent = req.decoded.isStudent;
		var studentName = req.decoded.name;
		if(isStudent) {
			var todoId = req.params.id;
			Todo.findByIdAndUpdate(todoId, {$push: {students: studentName}}, {'new': true}, function(err, result) {
				if(err) {
					res.send(err);
					return;
				}
				res.json({message: "Shared Todo updated!"})
			});
		} else {
			res.status(403).send({message: "This endpoint is only available to students!"});
		}
	})

	function checkIfStudent(req, res, next) {
		var isStudent = req.decoded.isStudent;

		if(isStudent) {
			res.status(403).send({message: "This endpoint is only available to teachers!"});
		} else {
			Teacher.findOne({_id: req.decoded.id}).select("subject isClassTeacher").exec(function(err, result) {
				if(err) {
					res.send(err);
					return;
				}
				req.decoded.isClassTeacher = result.isClassTeacher;
				req.decoded.subject = result.subject;
				next();
			});
		}
	}

	api.get('/mySubjectStudents', checkIfStudent, function(req, res) {

		Student.find({subjects: {$elemMatch: {name: req.decoded.subject}}}).select("name email").exec(function(err, students) {
			if(err) {
				res.send(err);
				return;
			}
			res.json({students: students});
		})
	});

	api.put('/mySubjectStudents/:id', checkIfStudent, function(req, res){
		var studentId = req.params.id;
		Student.findOneAndUpdate({_id: studentId, subjects: {$elemMatch: {name: req.decoded.subject}}}, { "$inc": { "subjects.$.attendance": 1}}, {'new': true}, function(err, result) {
			if(err) {
				res.send(err);
				return;
			}
			return res.json({message: "Attendance updated!"})
		})
	})

	api.put('/sharedTodo', checkIfStudent, function(req, res) {
		var todo =  new Todo(req.body);
		todo.save(function(err) {
			if(err) {
				res.send(err);
				return;
			}
			return res.json({message: "Shared ToDo Task created!"})
		});
	});

	api.get('/students', checkIfStudent, function(req, res) {
		if(!req.decoded.isClassTeacher) {
			res.status(403).send({message: "This endpoint is only available to the Class Teacher!"})
		} else {
			Student.find({}).select("name email").exec(function(err, students) {
				if(err) {
					res.send(err);
					return;
				}
				res.json({students: students})
			})
		}
	});

	api.get('/:student/subjects', checkIfStudent, function(req, res) {
		if(!req.decoded.isClassTeacher) {
			res.status(403).send({message: "This endpoint is only available to the Class Teacher!"})
		} else {
			var studentId = req.params.student;
			Student.findOne({_id: studentId}).select("name email subjects").exec(function(err, student) {
				if(err) {
					res.send(err);
					return;
				}
				res.json({name: student.name, email: student.email, subjects: student.subjects})
			})
		}
	})

	api.get('/:student/todo', checkIfStudent, function(req, res) {
		if(!req.decoded.isClassTeacher) {
			res.status(403).send({message: "This endpoint is only available to the Class Teacher!"})
		} else {
			var studentId = req.params.student;
			Student.findOne({_id: studentId}).select("name email todo").exec(function(err, student) {
				if(err) {
					res.send(err);
					return;
				}
				res.json({name: student.name, email: student.email, subjects: student.todo})
			})
		}
	})


	return api;
}