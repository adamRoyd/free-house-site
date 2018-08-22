const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { catchErrors } = require('../handlers/errorHandlers');

router.get('/', userController.loginForm);
router.get('/main', authController.isLoggedIn, storeController.mainPage);

router.get('/login', userController.loginForm);
router.post('/login', authController.login);

router.get('/register', userController.registerForm);

// 1. Validate the registration data
// 2. register the user
// 3. we need to log them in
router.post('/register',
  userController.validateRegister,
  userController.register,
  authController.login
);

router.get('/createuser', authController.isAdmin, userController.createUserForm)

router.post('/createUser',
    userController.validateCreateUser,
    userController.createUser
    // redirect to create user 
);

router.get('/logout', authController.logout);

router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token',
  authController.confirmedPasswords,
  catchErrors(authController.update)
);

router.post('/download',
    storeController.download
);

router.post('/downloadProposal',
    storeController.downloadProposal
);

router.post('/downloadFinancials',
    storeController.downloadFinancials
);

router.post('/downloadValuation',
    storeController.downloadValuation
);

module.exports = router;
