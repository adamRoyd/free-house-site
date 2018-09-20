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
    res.render('nda', { title: 'Nondisclosure Agreement' });
}

exports.privacyPolicy = (req, res) => {
    res.render('gdpr', { title: 'Privacy Policy' });
}

exports.contact = (req, res) => {
    res.render('contact', { title: 'Contact' });
}

exports.sendMessage = async (req, res) => {
    var user = req.user;
    var message = req.body.bodyText.replace(/\n/g, "<br />");
    await mail.sendEnquiry({
        user,
        message,
        filename: 'enquiry',
        subject: 'Free house london enquiry',        
    }).catch(function(err) {
        console.info('error: ', err);
    });

    req.flash('success', 'Message sent');
    res.render('contact', { title: 'Main', body: req.body, flashes: req.flash() });
}

exports.termsAndConditions = (req, res) => {
    res.render('termsandconditions', { title: 'Terms and Conditions' });
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
        req.checkBody('terms-and-conditions', 'You must accept the nondisclosure agreement').notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        req.flash('error', errors.map(err => err.msg));
        res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
        return; // stop the fn from running
    }
    next(); // there were no errors!
};

exports.register = async (req, res, next) => {

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
        req.flash('error', 'User with that already exists. Try logging on instead.');
        res.render('login', { title: 'Login', flashes: req.flash() });
        return;
    }

    const user = new User({ email: req.body.email, name: req.body.name, usertype: 1, isAdmin: false, nondisclosureAgreementAccepted: true, dateAccepted: Date.now() });
    const register = promisify(User.register, User);
    await register(user, req.body.password);
    next();
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
        res.render('createUser', { title: 'Create User', body: req.body, flashes: req.flash() });
    }

    const errors = req.validationErrors();
    if (errors) {
        req.flash('error', errors.map(err => err.msg));
        res.render('createUser', { title: 'Create User', body: req.body, flashes: req.flash() });
        return; // stop the fn from running
    }

    req.body.usertype = req.body.usertype == 'Special (Agrees to NDA)' ? 2 : 3;

    next(); // there were no errors!
};

exports.createUser = async (req, res, next) => {
    const token = crypto.randomBytes(20).toString('hex');
    const user = new User({ email: req.body.email, name: req.body.name, usertype: req.body.usertype, token: token, isAdmin: false, nondisclosureAgreementAccepted: false });
    const placeholderpassword = crypto.randomBytes(20).toString('hex');

    const userType = req.body.usertype === 2 ? 'special' : 'elite'

    const resetURL = `https://www.FreeHouseLDN.com/${userType}/${token}`;
    await mail.send({
        user,
        filename: 'new-user',
        subject: 'Access to free house london',
        resetURL
    }).catch(function(err) {
        console.info('error: ', err);
        req.flash('error', 'Email failed to send. Please contact Adam to fix.');
        res.render('createUser', { title: 'Create User', body: req.body, flashes: req.flash() });
        return;
    });

    const register = promisify(User.register, User);
    await register(user, placeholderpassword);

    req.flash('success', 'User created! 👋');

    res.render('createUser', { title: 'Create User', body: req.body, flashes: req.flash() });

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
    req.body.terms ?
        true :
        req.checkBody('terms-and-conditions', 'You must accept the nondisclosure agreement').notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        req.flash('error', errors.map(err => err.msg));
        res.render('setpasswordspecial', { title: 'Welcome', body: req.body, flashes: req.flash() });
        return; // stop the fn from running
    }

    next(); // there were no errors!
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

exports.ndaAccepted = async (req, res, next) => {

    await User.update(
        { token: req.params.token },
        {
            $set: {
                nondisclosureAgreementAccepted: true,
                dateAccepted: Date.now()
            },
        }
    );

    next();
}

