const express = require('express');
const session = require('express-session');
const router = express.Router();

const ADMIN_USERNAME = "teacher";
const ADMIN_PASSWORD = "securepassword123";

const requireAuth = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
};

router.get('/login', (req, res) => {
    res.render('admin/login', { errorMessage: null });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', username, password);

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        console.log('Login OK, redirecting to /admin');
        return res.redirect('/admin');
    }

    console.log('Login FAIL');
    res.status(401).render('admin/login', {
        errorMessage: 'Fel användarnamn eller lösenord.',
    });
});
