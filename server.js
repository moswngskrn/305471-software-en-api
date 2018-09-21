var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var MongoClient = require('mongodb').MongoClient;
var ip = require("ip");
var JSONStream = require('JSONStream');
var jwt = require('jsonwebtoken');

var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = '58364609wongsakorn';

var route = require('./route');
var login = require('./login');
var config = require('./config');

var mongodb = {};

var app = express();

app.use(cors());
app.use(bodyParser.json({
  limit: '50mb'
}));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use('*',function(req,res,next){
  res.set({
    'Access-Control-Expose-Headers': 'Authorization',
    'Content-Type': 'application/json; charset=utf-8',
    'Bind-Address': ip.address()+':'+config.port
  });
  next();
});

app.param('db', function(req, res, next, value) {
  req.mongodb = mongodb[value];
  next();
});

app.param('collection', function(req, res, next, value) {
  req.collection = req.mongodb.db.collection(value);
  next();
});

/*app.post('/login', rewrite('/_login/cores/user_db'));
app.post('/_login/:db/:collection', login);*/

app.use('/mongodb/:db/:collection', route);

app.get('/servertime', function (req, res) {
  var long_date = new Date().getTime()
  res.send(long_date.toString());
});

app.post('/register',function(req,res){
  var user = req.headers.user;
  var pass = req.headers.pass;

  mongodb['cores'].db.collection('users').insert({username:user,password:encrypt(pass)},function(err,data){
    if(!err){
      res.send({data:data,msg:"insert success"})
    }else{
      res.send({msg:"can not insert kub."})
    }
  })
})

app.post('/login',function(req,res){
  var user = req.headers.user;
  var pass = req.headers.pass;

  mongodb['cores'].db.collection('users').find({username:user,password:encrypt(pass)}).toArray(function(err,user){
    if(!err){
      if(user.length>1){
        var token = jwt.sign({user:user}, '58364609wongsakorn', {
          expiresIn: '7d'
        });
  
        res.send({
          token:token,
          status:true,
          msg:"login success"
        })
      }
      else{
        res.send({
          status:false,
          msg:"can not login"
        })
      }
    }else{
      res.send({
        status:false,
        msg:"error database"
      })
    }
  })
})

var count = config.mongodb.length;

config.mongodb.forEach(function(db_config) {  
  MongoClient.connect(db_config.url,
    function(err, db) {
      if (!err) {
        count--;
        mongodb[db_config.db] = {
          'db': db,
          'config': db_config
        };
        if (count == 0) {
          app.listen(config.port, function() {
            console.log('Server listening on port %d', this.address().port);
          });
        }
      }
    });
});

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}
