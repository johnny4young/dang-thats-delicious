const passport = require('passport')
const crypto = require('crypto')
const mongoose = require('mongoose')
const User = mongoose.model('User')
const {promisify} = require('es6-promisify')
const mail = require('../handlers/mail')

exports.login = passport.authenticate('local', {
	failureRedirect: '/login',
	failureFlash: 'Failed Login!',
	successRedirect: '/',
	successFlash: 'You are logged in'
})

exports.logout = (req, res) => {
	req.logout();
	req.flash('success', 'You are now logged out!')
	res.redirect('/')
}

exports.isLoggedIn = (req, res, next) => {
	if(req.isAuthenticated()){
		next()
		return
	}
	req.flash('error', 'Oops you must be logged in to do that')
	res.redirect('/login')
}

exports.forgot = async(req, res) => {
	//1. see if an user with that email exists
	const user = await User.findOne({email: req.body.email})
	if(!user){
		req.flash('error', 'No account with that email exists')
		return res.redirect('/login')
	}
	//2. set reset tokens and expiry on their account
	user.resetPasswordToken = crypto.randomBytes(20).toString('hex')
	user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
	await user.save()
	//3. send them an email with the token
	const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`
	await mail.send({
		user,
		filename: 'password-reset',
		subject: 'Password Reset',
		resetURL
	})
	req.flash('success', `You have been emailed a password reset link. ${resetURL}`)
	//4. redirect to login page
	res.redirect('/login')

}


exports.reset = async(req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: {$gt: Date.now()}
	})

	if(!user){
		req.flash('error', 'Password reset is invalid or has expired')
		return res.redirect('/login')
	}

	//if there is an user, show the rest password form
	res.render('reset', {title: 'Reset your password'})


}

exports.confirmedPasswords = (req, res, next) =>  {
	if(req.body.password === req.body['password-confirm']){
		next()
		return
	}
	req.flash('error', 'Passwords do not match!')
	res.redirect('back')
}

exports.update = async(req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: {
			$gt: Date.now()
		}
	})
	if (!user) {
		req.flash('error', 'Password reset is invalid or has expired')
		return res.redirect('/login')
	}

	const setPassword = promisify(user.setPassword.bind(user))
	await setPassword(req.body.password)
	user.resetPasswordToken = undefined;
	user.resetPasswordExpires = undefined;
	const updatedUser = await user.save()
	await req.login(updatedUser)
	req.flash('success', 'Nice! your password has been reset! you are logged in')
	res.redirect('/')
}