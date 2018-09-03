const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const crypto = require('crypto');
const mail = require('../handlers/mail');

exports.landingForm = (req, res) => {
  res.render('landing', { title: 'Welcome' });
};

exports.loginForm = (req, res) => {
  res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
  res.render('register', { title: 'Register' });
};

exports.createUserForm = (req, res) => {
    res.render('createUser', { title: 'Create User' });
}

exports.validateRegister = (req, res, next) => {
  req.sanitizeBody('name');
  req.checkBody('name', 'You must supply a name!').notEmpty();
  req.checkBody('email', 'That Email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    gmail_remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password Cannot be Blank!').notEmpty();
  req.checkBody('password-confirm', 'Confirmed Password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Oops! Your passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    return; // stop the fn from running
  }
  next(); // there were no errors!
};

exports.validateCreateUser = async (req, res, next) => {
    req.sanitizeBody('name');
    req.checkBody('name', 'You must supply a name!').notEmpty();
    req.checkBody('email', 'That Email is not valid!').isEmail();
    req.sanitizeBody('email').normalizeEmail({
      gmail_remove_dots: false,
      remove_extension: false,
      gmail_remove_subaddress: false
    });

    req.sanitizeBody('usertype');
    req.checkBody('usertype').notEmpty();

    const user = await User.findOne({ email: req.body.email });
    if(user) {
      req.flash('error', 'User already exists');
      res.render('createuser', { title: 'Create User', body: req.body, flashes: req.flash() });
    }

    const errors = req.validationErrors();
    if (errors) {
      req.flash('error', errors.map(err => err.msg));
      res.render('createuser', { title: 'Create User', body: req.body, flashes: req.flash() });
      return; // stop the fn from running
    }
    
    req.body.usertype = req.body.usertype == 'Special (creates password and agrees to NDA)' ? 2 : 3;

    next(); // there were no errors!
};

exports.createUser = async (req, res, next) => {
  const token = crypto.randomBytes(20).toString('hex');
    const user = new User({ email: req.body.email, name: req.body.name, usertype: req.body.usertype, token: token });
    const placeholderpassword = crypto.randomBytes(20).toString('hex');
    const register = promisify(User.register, User);
    await register(user, placeholderpassword);

    const resetURL = `http://${req.headers.host}/special/${token}`;
    await mail.send({
      user,
      filename: 'new-user',
      subject: 'Access to free house london',
      resetURL
    });
    
    req.flash('success', 'User created! 👋');
    //req.flash('success', 'User created! 👋');
    res.render('createuser', { title: 'Create User', body: req.body, flashes: req.flash() });
    //res.redirect('/createUser');
};

exports.register = async (req, res, next) => {
  //TODO check if user already exists
  const user = new User({ email: req.body.email, name: req.body.name, usertype: 1 });
  const register = promisify(User.register, User);
  await register(user, req.body.password);
  next(); // pass to authController.login
};



exports.account = (req, res) => {
  res.render('account', { title: 'Edit Your Account' });
};

exports.updateAccount = async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email
  };

  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $set: updates },
    { new: true, runValidators: true, context: 'query' }
  );
  req.flash('success', 'Updated the profile!');
  res.redirect('back');
};

exports.registerSpecial = async (req, res, next) => {
  const user = await User.findOne({ token: req.params.token });

  if (!user) {
    req.flash('error', 'User is invalid or has expired');
    return res.redirect('/login');
  }
  // if there is a user, show the set password form
  res.render('setpasswordspecial');
}