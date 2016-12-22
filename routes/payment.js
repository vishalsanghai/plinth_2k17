var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var Eventx = require('../models/event');
var User = require('../models/user');
var UserEvent = require('../models/userevent');
var Verify = require('./verify');
var Robotics = require('../models/robotics');
var Ecell = require('../models/ecell');
var Quiz = require('../models/quiz');
var Literary = require('../models/literary');
var Astronomy = require('../models/astronomy');
var Cybros = require('../models/cybros');
var Sif = require('../models/sif');
var PaymentDB = require('../models/payment');
var PaymentMUN = require('../models/paymentMUN');
var mongoose = require('mongoose');
var paytm = require('../config/paytm');
var eventURL = require('../config/eventURL');
var checksum = require('../checksum/checksum');

var hostURL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://plinth.in'
var paytmURL = 'https://secure.paytm.in/oltp-web/processTransaction';

router.post('/fetchData', Verify.verifyOrdinaryUser, function(req, res) {
    console.log('*******')
    console.log(req.body.clubName)
    var totalAmount = 100;
    switch(req.body.clubName) {
        case "astronomy":
            eventx = Astronomy;
            break;
        case "coding":
            eventx = Cybros;
            var totalAmount = 150;
            break;
        case "literature":
            eventx = Literary;
            break;
        case "robotics":
            eventx = Robotics;
            totalAmount = 200;
            break;
        case "management":
            eventx = Ecell;
            break;
        case "quizzing":
            eventx = Quiz;
            break;
    }

    if(req.body.eventName === "robowar") totalAmount = 700;
    if(req.body.eventName === "quadcopter") totalAmount = 600;
console.log(req.body.eventName);
    eventx.find({ 'eventName' : req.body.eventName , 'teamEmail' : req.body.email },function (err, result) {
        if (err){
            return console.error(err);
        }
        else{
            console.log(2,result);
            response = {
                data : result,
                totalAmount : totalAmount,
            }
            res.json(response);
        }
    });

});

router.get('/initiatepayment', function(req, res) {
    paymentdb = new PaymentDB();
    var totalAmount = 100;
    var id = req.query.id;

    switch(req.query.clubName) {
        case "astronomy":
            eventx = Astronomy;
            break;
        case "coding":
            eventx = Cybros;
            var totalAmount = 150;
            break;
        case "literature":
            eventx = Literary;
            break;
        case "robotics":
            eventx = Robotics;
            totalAmount = 200;
            break;
        case "management":
            eventx = Ecell;
            break;
        case "quizzing":
            eventx = Quiz;
            break;
    }

    if(req.query.eventName === "robowar") totalAmount = 700;
    if(req.query.eventName === "quadcopter") totalAmount = 600;

    eventx.findOne({'_id' : id },function (err, results) {
        if (err){
            return console.error(err);
        }
        else{
            if(results){
                DB.count({}, function(err, count){
                    if (err){
                        return console.error(err);
                    }
                    else{
                        var id_tag = process.env.NODE_ENV === 'development' ? 'dev' : '2017'
                        var event_order_id = "Plinth-" + req.query.eventName + "-" + (count + 1) + "-" + id_tag;
                        paymentdb.id = id;
                        paymentdb.clubName = req.query.clubName;
                        paymentdb.eventName = req.query.eventName;
                        console.log(results)
                        timestamp = + new Date();
                        paramaters ={
                            REQUEST_TYPE    : "DEFAULT",
                            ORDER_ID        : event_order_id,
                            CUST_ID         : "plinth-" + results.teamEmail,
                            TXN_AMOUNT      : totalAmount,
                            CHANNEL_ID      :'WEB',
                            INDUSTRY_TYPE_ID : paytm.industryID,
                            MID             : paytm.mid,
                            WEBSITE         : paytm.website,
                            CALLBACK_URL    : hostURL +  '/payment/response',
                        }
                        checksum.genchecksum(paramaters, paytm.key, function (err, result) {
                            paymentdb.order_id = result.ORDER_ID;
                            paymentdb.save(function(err) {
                                if (err){
                                    return done(err);
                                }
                                else{
                                    result['PAYTM_URL'] = paytmURL;
                                    res.render('pgredirect2.ejs',{ 'restdata' : result});
                                }
                            })
                        });
                    }
                });
            }
            else{
                res.json({status : false});
            }
        }
    });
});


router.post('/mun/initiatepayment', function(req, res) {
    var paymentmun = new PaymentMUN();
    console.log(req.body.user)
    var id_tag = process.env.NODE_ENV === 'development' ? 'dev' : '2017'
    if((req.body.type !== "delegate" && req.body.type !== "ip") || req.body.accommodation < 0){
        res.json({status : false, message : "Data Tempered"});
    }
    else{
        var accommodation = req.body.user.accommodation;
        var amount = req.body.type === "delegate" ? 1300 : 750;
        amount = amount + (200 * accommodation)

        PaymentMUN.count({}, function(err, count){
            var order_id = "MUN-" + req.body.type + "-" + (count + 1) + "-" + id_tag;
            paymentmun.order_id       = order_id;
            paymentmun.type           = req.body.type;
            paymentmun.name           = req.body.user.name;
            paymentmun.email          = req.body.user.email;
            paymentmun.phoneNumber    = req.body.user.phoneNumber;
            paymentmun.institute      = req.body.user.institute;
            paymentmun.accommodation  = accommodation;
            paymentmun.amount         = amount;
            paymentmun.status         = "";


            paymentmun.save(function(err) {
                if (err){
                    console.log(err);
                    return;
                }
                else{
                    res.json({ order_id : order_id, status : true})
                }
            });
        });
    }
});

router.get('/mun/initiatepayment', function(req, res) {
    var paymentmun = new PaymentMUN()
    var order_id = req.query.order_id;
    console.log(hostURL)
    PaymentMUN.findOne({'order_id' : order_id },function (err, result) {
            paramaters ={
                REQUEST_TYPE     : "DEFAULT",
                ORDER_ID         : order_id,
                CUST_ID          : "plinth-" + result.email,
                TXN_AMOUNT       : result.amount,
                CHANNEL_ID       :'WEB',
                INDUSTRY_TYPE_ID : paytm.industryID,
                MID              : paytm.mid,
                WEBSITE          : paytm.website,
                // MOBILE_NO        : result.phoneNumber,
                // EMAIL            : result.email,
                CALLBACK_URL     : hostURL + '/payment/mun/response',
            }

            // Create an array having all required parameters for creating checksum.
            checksum.genchecksum(paramaters, paytm.key, function (err, result) {
                paymentmun.save(function(err) {
                    if (err){
                        return done(err);
                    }
                    else{
                        result['PAYTM_URL'] = paytmURL;
                        console.log(result);
                        res.render('pgredirect2.ejs',{ 'restdata' : result});
                    }
                })
            });
        });
});

router.post('/response', Verify.verifyOrdinaryUser,function(req,res){
    var paramlist = req.body;

    if(checksum.verifychecksum(paramlist, paytm.key)){
        PaymentDB.findOne({'order_id' : paramlist.ORDERID}, function(err, result){
            if(err){
                console.log(err)
                return;
            }
            else{

                if(paramlist.STATUS === "TXN_FAILURE"){
                    res.render('payment_failed', {
                        clubName : result.clubName,
                        backURL : eventURL[doc.eventName],
                    });
                }

                switch(result.clubName) {
                    case "astronomy":
                        eventx = Astronomy;
                        break;
                    case "coding":
                        eventx = Cybros;
                        break;
                    case "literature":
                        eventx = Literary;
                        break;
                    case "robotics":
                        eventx = Robotics;
                        break;
                    case "management":
                        eventx = Ecell;
                        break;
                    case "quizzing":
                        eventx = Quiz;
                        break;
                }

                payment = {
                    status   : paramlist.STATUS,
                    order_id : paramlist.ORDERID,
                    date     : paramlist.TXNDATE,
                    amount   : paramlist.TXNAMOUNT
                }
                eventx.findOneAndUpdate({'_id' : result.id}, {$set : {'payment' : payment}},{new: true}, function(err, doc){
                    if(err){
                        console.log(err);
                        return;
                    }
                    else{
                        if(paramlist.STATUS === 'TXN_SUCCESS'){
                            var emails = [];
                            for(var i=0; i<doc.team.length; i++ ){
                                emails.push(doc.team[i].email);
                            }
                            // bulk

                            var bulk = UserEvent.collection.initializeOrderedBulkOp();
                            for(var i=0; i < emails.length; i++){
                                bulk.find({'email': emails[i]}).upsert().update(
                                    {
                                        $push : {paidEvents: result.eventName},
                                        $set  : {email : emails[i]}
                                    }
                                );
                            }
                            bulk.execute();

                            var bulk = User.collection.initializeOrderedBulkOp();
                            for(var i=0; i < emails.length; i++){
                                bulk.find({'email': emails[i]}).update({$push: {paidEvents: result.eventName}});
                            }
                            bulk.execute();
                            res.render('payment_succeed',{
                                details : doc,
                                backURL : eventURL[doc.eventName],
                            })
                        }
                        else{
                            res.render('payment_open',{
                                amount   : doc.payment.amount,
                                order_id : doc.payment.order_id,
                                eventName : doc.eventName,
                                backURL : eventURL[doc.eventName],
                            })
                        }
                    }
                });
            }
        })
    }
    else{
        res.render('payment_failed', {
            clubName : result.clubName,
            backURL : eventURL[doc.eventName],
        });
    };
});


router.post('/mun/response', Verify.verifyOrdinaryUser,function(req,res){
    var paramlist = req.body;
    if(checksum.verifychecksum(paramlist, paytm.key)){
        PaymentMUN.findOneAndUpdate({'order_id' : paramlist.ORDERID}, {$set : {'status' : paramlist.STATUS }},{new: true}, function(err, result){
            if(err){
                console.log(err)
                return;
            }
            else{
                console.log(paramlist);
                if(paramlist.STATUS === "OPEN"){
                    res.render('payment_open',{
                        amount   : doc.payment.amount,
                        order_id : doc.payment.order_id,
                        eventName : doc.eventName
                    })
                }
                else if(paramlist.STATUS === 'TXN_SUCCESS'){
                    doc ={
                        team : [
                            {
                                name : result.name,
                                email : result.email,
                                phoneNumber : result.phoneNumber,
                            }
                        ],
                        payment :{
                            order_id : result.order_id,
                            date : paramlist.TXNDATE,
                            amount : paramlist.TXNAMOUNT,
                        },
                        eventName : "MUN 2017"
                    }
                    res.render('payment_succeed',{
                        details : doc,
                        backURL : "/mun"
                    })
                }
                else{
                    res.render('payment_failed', {
                        clubName : "",
                        backURL : "/mun/pay",
                    });
                }
            }
        });
    }
    else{
        res.render('payment_failed', {
            clubName : "",
        });
    };
});

router.get('/check', Verify.verifyOrdinaryUser,function(req,res){
    console.log(paytm)
    res.end('awds');
})





module.exports = router;