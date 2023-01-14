var MongoClient = require('mongodb').MongoClient;
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');//Step 1
var path = require('path');
const { ObjectId } = require('mongodb');

//### jwt and hashing related codes ######//
var bcrypt = require("bcrypt");
const saltRounds = 10

const jwt = require('jsonwebtoken');
const JWT_SECRET_KEY = 'my_secret_key'
//### jwt and hashing related codes ######//


app.all("/*", function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS,DELETE,PUT");
    res.header("Access-Control-Allow-Origin", "*"); 
    return next();
});

app.use(express.static(__dirname ));//Step 2

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

var url = "mongodb://localhost:27017/";

var dbo;

function handleDisconnect() {

	MongoClient.connect(url, function(err, db) {
	  if (err) throw err;
	  dbo = db.db("mydb1");
	});
}

handleDisconnect();


//Step 3: Configure multer
var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) { //Default folder config
        cb(null, __dirname+'/uploads');
    },
    filename: function (req, file, cb) {
        //Attach timestamp beside file name
        var datetimestamp = Date.now();
        cb(null, file.originalname.replace(
            path.extname(file.originalname)) 
        + '-' + Date.now() + path.extname(file.originalname))
    }
});

var uploadEmployeeProfile = multer({ //multer settings
    storage: storage
}).single('file');

//upload a file
app.post('/upload', function(req, res) {
    console.log('hi');
    console.log(req.body);
    uploadEmployeeProfile(req,res,function(err){
        if(err){
            res.json({error_code:1,err_desc:err});
            return;
        }
        //res.json({error_code:0,err_desc:null});
        res.json({"filename":"uploads/"+req.file.filename});
        //console.log(req.file);
    });
});

//get all employees
app.get('/employees',function(req,res){
var mysort = { name: -1 };
  dbo.collection("employees").find().sort(mysort).toArray(function(err, result) {
    if (err) throw err;
    res.json(result);
    dbo.close;
  });
});

//get employee by id
app.get('/employees/:id',(req,res) => {
    var query = {_id: new ObjectId(req.params.id)};
    console.log(query)
    dbo.collection("employees").findOne(query, function(err, result) {
        if (err) throw err;
        res.json(result);
        dbo.close;
      });
});

//create new employee
app.post('/employees',(req,res) => {

    uploadEmployeeProfile(req,res,function(err){
        if(err){
            res.json({error_code:1,err_desc:err});
            return;
        }

        var filePath = `uploads/${req.file.filename}`;
        var body = { ...req.body, profilepic: filePath };

            
        dbo.collection("employees").insertOne(body, function(err, result) {
            if (err) throw err;
            res.json({
                message: "Employee details saved successfully",
                data : body
            });
            dbo.close;
          });

    });
    
});

//delete employee by id
app.delete('/employees/:id',(req,res) => {
    var query = {_id: new ObjectId(req.params.id)};
    console.log(query)
    dbo.collection("employees").deleteOne(query, function(err, result) {
        if (err) throw err;
        res.json(result);
        dbo.close;
      });
});
//update employee
app.put('/employees/:id',(req,res) => {
    var query = {_id: new ObjectId(req.params.id)};
    console.log(query)
    const newValues = { $set: {...req.body}}
    dbo.collection("employees").updateOne(query,newValues, function(err, result) {
        if (err) throw err;
        res.json(result);
        dbo.close;
      });
});



/* registration endpoint */
app.post('/register',function(req, res){
    console.log(req.body);

    //generate salt and hash theh pawd before save the account into the database
    bcrypt
  .genSalt(saltRounds)
  .then(salt => {
    console.log('Salt: ', salt)
    return bcrypt.hash(req.body.pwd, salt)
  })
  .then(hash => {
   // console.log('Hash: ', hash)
//    store ther user into the database
    // var password = bcrypt.hash(req.body.pwd);
    //var sqlQuery = `INSERT INTO users(email,pwd,name) values('${req.body.email}','${hash}','${req.body.name}') `;
    var userObj = {email: req.body.email, pwd: hash, name: req.body.name };
    dbo.collection("users").insertOne(userObj,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {
            //console.log(result.insertId);
            //TODO: dont return pwd in response
            res.json(result);
        }
    });
  })
  .catch(err => console.error(err.message))

    //validate the pwd
   
});

/* ./registration endpoint */
/* token endpoint */
app.post('/token',function(req, res){
    console.log(req.body);


//validate the pwd
    // var password = bcrypt.hash(req.body.pwd);
    var query = {email: req.body.email};
    console.log(query);
    dbo.collection("users").findOne(query,function(err,result){
        if(err)
        {
            console.log(err);
        }
        else
        {

            if(result!==null && result!==undefined) {
                var userPwd = result.pwd;
                console.log("stored user pwd => ", userPwd);
                bcrypt
                .hash(req.body.pwd, saltRounds)
                .then(hash => {
                        //compare two hashes
                        console.log("logn user pwd =>", req.body.pwd);
                        console.log("logn user pwd hash =>", hash);
                        bcrypt.compare(req.body.pwd,userPwd)
                    .then(res_ => {
                        // console.log(res) // return true
                        if(res_) {
                            //generate user token
                            let jwtSecretKey = JWT_SECRET_KEY;
                            let data = {
                                time: Date(),
                                email: req.body.email,
                                name: result.name,
                            }

                            const token = jwt.sign(data, jwtSecretKey,{
                                expiresIn: 3600
                            });

                            res.json({
                            token : token
                            });
                        } else {
                          res.status(400).json({
                                message : "Invalid credentials"
                            })
                        }
                    })
                    .catch(err => console.error(err.message)) 
                 })
                .catch(err => console.error(err.message))
            } else {
                res.json({
                    message : "Invalid credentials"
                }).status(400).status(400);
            }
            //

           
            //console.log(result.insertId);
           // res.json(result);
        }
    });
    


   

    
});
/* ./token endpoint */




//###########

var server = app.listen(8082, function () {

   var host = server.address().address
   var port = server.address().port

   console.log("Example app listening at http://%s:%s", host, port)
})