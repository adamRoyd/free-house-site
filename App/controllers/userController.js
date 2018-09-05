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

exports.nda = (req, res) => {
    res.render('nda', { title: 'Nondisclosure Agreement'});
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
    
    req.body.terms ? 
        true : 
        req.checkBody('terms-and-conditions', 'You must accept the terms and conditions').notEmpty();

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
    if (user) {
        req.flash('error', 'User already exists');
        res.render('createuser', { title: 'Create User', body: req.body, flashes: req.flash() });
    }

    const errors = req.validationErrors();
    if (errors) {
        req.flash('error', errors.map(err => err.msg));
        res.render('createuser', { title: 'Create User', body: req.body, flashes: req.flash() });
        return; // stop the fn from running
    }

    req.body.usertype = req.body.usertype == 'Special (Agrees to NDA)' ? 2 : 3;

    next(); // there were no errors!
};

exports.createUser = async (req, res, next) => {
    const token = crypto.randomBytes(20).toString('hex');
    const user = new User({ email: req.body.email, name: req.body.name, usertype: req.body.usertype, token: token, isAdmin: false });
    const placeholderpassword = crypto.randomBytes(20).toString('hex');
    const register = promisify(User.register, User);
    await register(user, placeholderpassword);

    const userType = req.body.usertype === 2 ? 'special' : 'elite'

    const resetURL = `http://${req.headers.host}/${userType}/${token}`;
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

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
        req.flash('error', 'User with that already exists. Try logging on instead.');
        res.render('login', {title: 'Login', flashes: req.flash() });
        return;
    }

    const user = new User({ email: req.body.email, name: req.body.name, usertype: 1, isAdmin: false });
    const register = promisify(User.register, User);
    await register(user, req.body.password);
    next();
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

    if (!user || user.usertype !== 2) {
        req.flash('error', 'User is invalid. Please contact Free House for more information');
        return res.redirect('/login');
    }
    // if there is a user, go to set password page
    res.render('setpasswordspecial', { title: 'Welcome', user });
}

exports.specialUserTermsCheck = (req, res, next) => {
    // TODO check that the Terms and NDA have been agreed to.
    next();
}

exports.checkEliteUser = async (req, res, next) => {
    const user = await User.findOne({ token: req.params.token });

    if (!user || user.usertype !== 3) {
        req.flash('error', 'User is invalid. Please contact Free House for more information');
        return res.redirect('/login');
    }
    // if there is a user, automatically log them in
    next();
}

