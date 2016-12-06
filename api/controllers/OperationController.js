/**
 * OperationController
 *
 * @description :: Server-side logic for managing Operations
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var ping = require('ping');
var wait = require('wait.for');
var request = require('request');
var Kardia = require('kardia');
var kardia = Kardia.start({ name: 'health_check', host: '152.118.33.102', port: 1400});
var rp = require('request-promise');
var Promise = require('bluebird');

var registerOpen = false;
var transferOpen = false;

module.exports = {

  /**
   * `OperationController.ping()`
   */
  ping: function (req, res) {
	res.json({pong: 1});
  },


  /**
   * `OperationController.register()`
   */
  register: function (req, res) {
    var options = {
	method: 'POST',
	uri: 'http://152.118.33.102:1337/ewallet/check_quorum',
	body: { some: 'payload'},
	json: true
    };

    registerOpen = true;
    rp(options)
	.then(function (parsedBody) {
		if (parsedBody.quorum >= 5) {
			User.create({user_id: req.body.user_id, nama: req.body.nama, ip_domisili: req.body.ip_domisili}).exec(function (err, finn){
				if (err) { res.json({
					   error: true,
					   status_register: -1,
					   message: "This user_id was registered before, please use another user_id"}); 
					   registerOpen = false;
					 }
        			Transaction.create({user_id: req.body.user_id, nilai: 0, status_transfer: "initial"}).exec(function (err, finnn) {
                			if (err) { res.json({notification: "an error occured"}); }
                			if (registerOpen){
					  res.json({
						error: false,
						status_register: 0,
						notification: "Your account has been registered"});
					  registerOpen = false;
					}
        			});
    			});
		} else {
			res.json({notification: "jumlah quorum anda masih " + parsedBody.quorum + ", anda membutuhkan setidaknya 5"});
		}
	})
	.catch(function (err) {
		res.send(err);
	});
  },


  /**
   * `OperationController.getSaldo()`
   */
  getSaldo: function (req, res) {
	var options = {
		method: 'POST',
		uri: 'http://152.118.33.102:1337/ewallet/check_quorum',
		body: { some: 'payload'},
		json: true
	};

	rp(options)
		.then(function (parsedBody) {
			if (parsedBody.quorum >= 5 ) {
				Transaction.findOne({user_id: req.param('user_id')}).exec(function (err, record) {
				  if (err) { res.json({
					nilai_saldo: -1,
					quorum: parsedBody.quorum,
					error: true,
					message: "You're not registered in this branch, please register first" }); }
				  try {
					 res.json({
						nilai_saldo: record.nilai,
						quorum: parsedBody.quorum,
						error: false,
						message: "Your user id " + req.param('user_id') });
				  } catch(err) {
					res.json({nilai_saldo: -1, 
					quorum: parsedBody.quorum, 
					error: true, 
					message: "You're not registered in this branch, please register first" });
				  }
				});
			} else {
				res.json({notification: "jumlah quorum anda masih " + parsedBody.quorum + ", anda membutuhkan setidaknya 5"});
			}
		})
		.catch(function (err) {
			res.send(err);
		});
  },

  check_quorum: function(req, res) {
	PingService.check_quorum(req, res);
  },

  manual_transfer: function(req, res) {
	Transaction.create({user_id: req.body.user_id, nilai: req.body.nilai, status_transfer: req.body.status_transfer}).exec(function (err, finn) {
		res.json({notification: "Data transfer dengan id " + req.body.user_id + " dengan nilai transaksi " + req.body.nilai + " memiliki status " + req.body.status_transfer });
	});
  },

  getTotalSaldo: function(req, res) {
	if (req.param('user_id') === "1306464480"){
	  console.log("getTotalSaldo to self");
	  User.find({
	    id: {'<=':20 }
	  }).exec( function(err, users) {
                  var totalSaldo = 0;
		  users.forEach(function(user){
		     PingService.total_connect(req, res, user.ip_domisili, user.user_id);
		  });
	  });
	} else {
	  console.log("getTotalSaldo to others");
	  User.find({
	    user_id: req.param('user_id')
	  }).exec(function (err, users) {
	    request(users[0].ip_domisili + "/getTotalSaldo/" + req.param('user_id') , function(error, response, body) {
		console.log(users[0].ip_domisili + " contacted");
		console.dir(body);
		if (error) { res.json({ notification: "User tidak terdaftar"});  }
		else {
		  res.json({nilai_saldo: JSON.parse(body).nilai_saldo});
		}
	    });
	  });
	}
  },

  /**
   * `OperationController.transfer()`
   */
  transfer: function (req, res) {
    transferOpen = true;
    User.findOne({user_id: req.body.user_id}).exec(function (err, result) {
     if (err || (result == undefined) ) {
	  transferOpen = false;
          res.json({
		error: true, 
		message: "Your account is not registered, please register first",
		status_transfer: -1 });
      }
      else {
	var options = {
		method: 'POST',
		uri: 'http://152.118.33.102:1337/ewallet/check_quorum',
		body: { some: 'payload'},
		json: true
	};

	rp(options)
		.then(function (parsedBody) {
			if (parsedBody.quorum >= 8) {
				PingService.transfer_connect(req, res, result.ip_domisili, req.body.nilai, req.body.user_id);
			}
		})
		.catch(function (err) {
			res.send(err);
		});
      }
    });
  }
};

