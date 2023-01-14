var MongoClient = require('mongodb').MongoClient;
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');//Step 1
var path = require('path');
const { ObjectId } = require('mongodb');


app.all("/*", function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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

var server = app.listen(8082, function () {

   var host = server.address().address
   var port = server.address().port

   console.log("Example app listening at http://%s:%s", host, port)
})