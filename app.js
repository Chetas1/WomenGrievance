const express = require('express');
const mysql = require('mysql');
var cors = require('cors');
const bodyParser = require('body-parser');
var nodemailer = require('nodemailer');

// Create Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'womengrivance'
});

db.connect((err) => {
    if(err){
        throw err;
    }
    console.log('MySql Connected...');
});

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'womengreviance@gmail.com',
      pass: 'hvpm$1234'
    }
  });

// Creating a server
const app = express();
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.use(cors({origin: 'http://localhost:3000'}));

app.get('/getComplaintsAssociatedWithTeacher/:userId',(req, res) => {
    
    let userDepartment = `select Department from users where UserId='${req.params.userId}'`
    let department = ''; 
    db.query(userDepartment, (err, result) => {
        if(err) throw err;
        result.forEach(email => {
            department = (email.Department != '') ? email.Department.toLowerCase(): department;
        });

        let sql = `Select * from Complaints where StakeHolders='${department}'`;

        db.query(sql, (err, result) => {
            if(err) throw err;
            res.send(result);
        });
    
    });
    
});


app.get('/getTimeliness/:complaintId',(req, res) => {
    let sql = `Select * from timelines where ComplaintId='${req.params.complaintId}'`;
    db.query(sql, (err, result) => {
        if(err) throw err;
        res.send(result);
    });
});

app.get('/resolveComplaint/:complaintId/resolvedBy/:resolvedBy',(req, res) => {
    let sql = `update  timelines set Status='Resolved',ResolvedDate='${new Date()}' where ComplaintId='${req.params.complaintId}' 
    and AssignedTo = '${req.params.resolvedBy}' and Status ='Active'`;
    db.query(sql, (err, result) => {
        if(err) throw err;
    });

    let sqlForComplaints = `update  Complaints set Status='Resolved' where Complaint='${req.params.complaintId}'`;
    db.query(sqlForComplaints, (err, result) => {
        if(err) throw err;
    });

    let getComplaintRegisteredBy = `Select RegisteredBy from Complaints where Complaint='${req.params.complaintId}'`;

    let registeredBy = '';
    db.query(getComplaintRegisteredBy, (err, result) => {
        if(err) throw err;
        console.log(result);
        result.forEach(email => {
            registeredBy = (email.RegisteredBy != '') ? email.RegisteredBy: registeredBy;
        });
        var mailOptions = {
            from: 'womengreviance@gmail.com',
            to: `${registeredBy}`,
            subject: 'Action taken against your registered complaint',
            text: `Your complaint has been marked as resolved`
          };
    
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } 
          });

    });

});

app.get('/transferComplaint/:complaintId/assignedToEmail/:assignedTo/transferFrom/:transferFrom',(req, res) => {
    let sql = `update  timelines set Status='Transferred',ResolvedDate='${new Date()}' where ComplaintId='${req.params.complaintId}' and AssignedTo='${req.params.transferFrom}'`;
    db.query(sql, (err, result) => {
        if(err) throw err;
    });
   
    let timelinesql = `Insert into timelines (ComplaintId, AssignedTo, AssignedDate, Status) values
      ('${req.params.complaintId}', '${req.params.assignedTo}','${new Date()}','Active')`;
      
    db.query(timelinesql, (err, result) => {
        if(err) throw err;
    });

    let getComplaintRegisteredBy = `Select RegisteredBy from Complaints where Complaint='${req.params.complaintId}'`;

    let registeredBy = '';
    db.query(getComplaintRegisteredBy, (err, result) => {
        if(err) throw err;
        console.log(result);
        result.forEach(email => {
            registeredBy = (email.RegisteredBy != '') ? email.RegisteredBy: registeredBy;
        });
        var mailOptions = {
            from: 'womengreviance@gmail.com',
            to: `${registeredBy}`,
            subject: 'Action taken against your registered complaint',
            text: `The complaint transffered from ${req.params.transferFrom} to ${req.params.assignedTo}`
          };
    
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } 
          });

    });
});

app.get('/getComplaintMessages/:complaintId',(req, res) => {
    let sql = `Select Message,RegisteredBy from chats where complaintId='${req.params.complaintId}'`;
    let messages = [];
    let RegisteredBy='';
    db.query(sql, (err, result) => {
        if(err) throw err;
        result.forEach(message => {
            RegisteredBy = message.RegisteredBy;
            messages.push(message.Message);
        });
        res.send({Messages : messages, RegisteredBy : RegisteredBy});
    });
});

app.get('/getListOfComplaints/:userId',(req, res) => {
    let sql = `Select RegisteredBy, Complaint from Complaints where AssignedTo='${req.params.userId}'`;
    let emailIds = [];

    let stakeholdersquery = `Select RegisteredBy, Complaint from Complaints where StakeHolders='cse'`;

    if (req.params.userId == "anjali.raut@hvpm.com")
        sql = stakeholdersquery;
    else if(req.params.userId == "pote.abhijeet@hvpm.com")
        sql = stakeholdersquery;

    db.query(sql, (err, result) => {
        if(err) throw err;
        result.forEach(element => {
            emailIds.push({RegisteredBy : element.RegisteredBy, Complaint : element.Complaint});
        });
        res.send(emailIds);
    });
});


app.get('/getUsers/branchcode/:branchCode',(req, res) => {
    let sql = `Select UserId, Name from users where Department='${req.params.branchCode.toUpperCase()}'`;
   
    db.query(sql, (err, result) => {
        if(err) throw err;
        res.send(result);
    });
});


app.post('/storeListOfComplaints',(req, res) => {

    let assignedTo;
    if(req.body.Branch == "cs" || req.body.Branch == "cse")
    {
        assignedTo = "yogesh.rochlani@hvpm.com"
    }

    var complaint = req.body.Complaint;
    var chatId = Math.floor((Math.random() * 10000) + 1);
    complaint.forEach(element => {
        let sql = `Insert into chats (RegisteredBy, Message, ComplaintId) values
        ('${req.body.RegisteredBy}','${element.message}','${chatId}' )`;

        db.query(sql, (err, result) => {
            if(err) throw err;
        });

    });

    let timelinesql = `Insert into timelines (ComplaintId, AssignedTo, AssignedDate, Status) values
      ('${chatId}', '${assignedTo}','${new Date()}','Active')`;

    db.query(timelinesql, (err, result) => {
        if(err) throw err;
    });

    let sql = `Insert into complaints (AssignedTo, StakeHolders, Complaint, RegisteredDate,RegisteredBy,Status) values
    ('${assignedTo}','${req.body.Branch}','${chatId}','${new Date()}',
    '${req.body.RegisteredBy}','${req.body.Status}' )`;

    db.query(sql, (err, result) => {
        if(err) throw err;
        var mailOptions = {
            from: 'womengreviance@gmail.com',
            to: `${req.body.RegisteredBy}`,
            subject: 'Complaint has been registered',
            text: `We have taken your request, you will get notified based on actions taken`
          };
    
        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } 
          });

        res.send(result);
    });
});


app.get('/getUser/:userId/password/:password',(req, res) => {
    let sql = `Select * from Users where UserId='${req.params.userId}' and password='${req.params.password}'`;
    db.query(sql, (err, result) => {
        if(err) throw err;
        res.send(result.length == 1);
    });
});


app.get('/sendMail',(req, res) => {
    
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

});

app.listen('3001', () => {
    console.log("Server started on port 3000");
});

