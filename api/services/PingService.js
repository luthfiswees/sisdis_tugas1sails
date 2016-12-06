var ping = require('ping');
var request = require('request');
var rp = require('request-promise');
var counter = 0;
var responded = false;
var accumulator = 0;
var accumulator_count = 0;

var transferConnect = false;

exports.check_quorum = function (req, res) {
    User.find({
        id: { '<=': 20 }
    }).exec( function (err, results){
        if (err) return "error";
	responded = true;
        results.forEach(function(record){
	  counter += 1;
          ping.sys.probe(record.ip_domisili, function(isAlive){
            if (isAlive) {
                User.update({ip_domisili: record.ip_domisili},{connected: "true"}).exec(function afterwards(err, updated) {
			console.log(record.ip_domisili + " connected");
			PingService.count_quorum(req, res, counter, results.length);
		});
            }else {
		User.update({ip_domisili: record.ip_domisili},{connected: "false"}).exec(function afterwards(err, updated) {
			//console.log(record.ip_domisili + " not connected");
			PingService.count_quorum_https(req, res, counter, results.length, record.ip_domisili);
			return "not connected";
		});
	    }
          });
        });
    });
  };

exports.count_quorum_https = function (req, res, counter, length, host) {
  request(host + "/ping", function(error, response, body) {
	console.log(body);
	if (error) {

	}else{
	  User.update({ip_domisili: host},{connected: "true"}).exec( function afterwards(err, updated) {
		console.log(host + " connected");
		PingService.count_quorum(req, res, counter, length);
	  });
	}
  });
}

exports.count_quorum = function (req, res, counter, length) {
	User.count({connected: "true"}).exec(function countCB(error, found) {
		if (counter < 30*length){
			PingService.count_quorum(req, res, counter + 1, length);
		} else {
			if (responded){
			  responded = false;
			  res.json({quorum: found});
			}
		}
	});
}

exports.transfer_connect = function(req, res, ip_tujuan, nilai_transfer, user_id_tujuan){
  transferConnect = true;
    console.log("transfer connection connected");
	Transaction.findOne({user_id: user_id_tujuan}).exec(function (err, record) {
		if (err && transferConnect) { transferConnect = false; res.json({status_transfer: -1, error: "true", message: "Your account is not registered"}); }
		console.dir(record);
		Transaction.update({user_id: user_id_tujuan},{nilai: parseInt(record.nilai) + parseInt(nilai_transfer)}).exec(function(errr, updated){
                    if (errr && transferConnect) { transferConnect = false; res.json({status_transfer: -1}); }
                    console.log(updated);
		    if (transferConnect) {
                      res.json({
			status_transfer: 0,
			error: false,
			message: "Success! Your balance now is " + updated[0].nilai
		      });
		    }
                });
	});

}

function accumulator_phase(req, res, value) {
  if (accumulator_count < 8){
	try{
	  accumulator += parseInt(value) ;
	} catch (err) {
	  accumulator += 0;
	}
	accumulator_count += 1;
	console.log("now accumulator value is " + accumulator);
  }else {
	res.json({nilai_saldo: accumulator});
	accumulator_count = 0
	accumulator = 0;
  }
}

exports.total_connect = function(req, res, alamat_cabang, user_id) {
  var options = {
	uri: alamat_cabang + "/getSaldo/" + user_id,
	json: true
  };

  rp(options)
	.then(function (response) {
	  console.log(alamat_cabang + " is responding");
	  console.dir(response);
	  accumulator_phase(req, res, response.nilai_saldo);
	})
	.catch(function (err) {

	});
}

