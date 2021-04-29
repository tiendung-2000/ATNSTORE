var express = require('express')
var engines = require('consolidate')
var app = express()

const session = require('express-session');

app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: 'some122$$%*$##!!#$%@#$%',
    cookie: { maxAge: 60000 }
}));

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017';

var hbs = require('hbs')
app.set('view engine', 'hbs')

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/register', (req, res) => {
    res.render('register')
})

app.post('/new', async (req, res) => {
    var nameInput = req.body.txtName;
    var passInput = req.body.txtPassword;
    var roleInput = req.body.role;
    var newUser = { name: nameInput, password: passInput, role: roleInput };

    let client = await MongoClient.connect(url);
    let dbo = client.db("atnstore");
    await dbo.collection("users").insertOne(newUser);
    res.redirect('/login')
})

app.post('/doLogin', async (req, res) => {
    var nameInput = req.body.txtName;
    var passInput = req.body.txtPassword;
    let client = await MongoClient.connect(url);
    let dbo = client.db("atnstore");
    const cursor = dbo.collection("users").
        find({ $and: [{ name: nameInput }, { password: passInput }] });

    const count = await cursor.count();

    if (count == 0) {
        res.render('login', { message: 'Invalid user!' })
    } else {
        let name = '';
        let role = ''
        await cursor.forEach(doc => {
            name = doc.name;
            role = doc.role;
        })
        req.session.User = {
            name: name,
            role: role
        }
        if (role == 'admin') {
            res.redirect('allProducts')
        } else {
            res.redirect('/')
        }
    }
})

app.get('/', async (req, res) => {
    var user = req.session.User;
    let client = await MongoClient.connect(url, { useUnifineTopology: true });
    let dbo = client.db("atnstore");
    let results = await dbo.collection("products").find({}).toArray();
    if (!user || user.name == '') {
        res.render('notLogin', { message: 'Login To Continue' })
    } else {
        res.render('index', { name: user.name, role: user.role, model: results })

    }
})

///////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/allProducts', async (req, res) => {
    var user = req.session.User;
    let client = await MongoClient.connect(url, { useUnifineTopology: true });
    let dbo = client.db("atnstore");
    let results = await dbo.collection("products").find({}).toArray();
    if (!user || user.name == '') {
        res.render('notLogin', { message: 'user chua dang nhap' })
    } else {
        res.render('allProducts', { name: user.name, role: user.role, model: results })

    }
})

app.get('/insertProducts', (req, res) => {
    res.render('insertProducts');
})

app.post('/doInsertProducts', async (req, res) => {
    let inputName = req.body.txtName;
    let inputPrice = req.body.txtPrice;
    let inputAmount = req.body.txtAmount;
    let inputImage = req.body.txtImage;

    //neu khong nhap gia tri
    if (inputName.trim().length == 0) {
        res.render('insertProducts', { nameError: "You not input Name!", priceError: null, amountError: null });
    } else {
        //khong duoc nhap chu
        if (isNaN(inputPrice, inputAmount)) {
            res.render('insertProducts', { nameError: null, priceError: "Chi duoc nhap so", amountError: "Chi duoc nhap so" });
            return false;
        };
        //khong duoc nhap vao so am
        if (inputPrice < 1 || inputAmount < 1) {
            res.render('insertProducts', { nameError: null, priceError: "Gia tri phai lon hon 0", amountError: "Gia tri phai lon hon 0" });
            return false;
        }
        let newProducts = { name: inputName, price: inputPrice, amount: inputAmount, image: inputImage };
        let client = await MongoClient.connect(url);
        let dbo = client.db("atnstore");
        await dbo.collection("products").insertOne(newProducts);
        res.redirect('/allProducts');
    }
})

app.get('/delete', async (req, res) => {
    let inputId = req.query.id;
    let client = await MongoClient.connect(url);
    let dbo = client.db("atnstore");
    var ObjectID = require('mongodb').ObjectID;
    let condition = { "_id": ObjectID(inputId) };
    await dbo.collection("products").deleteOne(condition);
    res.redirect('/allProducts');

})
app.post('/doSearchProducts', async (req, res) => {
    let inputName = req.body.txtName;
    let client = await MongoClient.connect(url);
    let dbo = client.db("atnstore");
    let results = await dbo.collection("products").find({ name: new RegExp(inputName, "i") }).sort({ Name: -1 }).toArray();
    //let results = await dbo.collection("products").find({}).sort({ Name: -1 }).toArray();

    res.render('allProducts', { model: results });
})

app.get('/update', async (req, res) => {
    let inputId = req.query.id;
    let client = await MongoClient.connect(url);
    let dbo = client.db("atnstore");
    var ObjectID = require('mongodb').ObjectID;
    let condition = { "_id": ObjectID(inputId) };
    let results = await dbo.collection("products").find(condition).toArray();
    res.render('update', { model: results });
})

app.post('/doupdate', async (req, res) => {
    let inputId = req.body.id;
    let inputName = req.body.txtName;
    let inputPrice = req.body.txtPrice;
    let inputAmount = req.body.txtAmount;
    let inputImage = req.body.txtImage;
    let Change = {
        $set:
            { name: inputName, price: inputPrice, amount: inputAmount, image: inputImage }
    };
    if (inputName.trim().length == 0) {
        let modelError = {
            nameError: "You have not entered a Name!",
        };
        res.render('insertProducts', { model: modelError });
    } else {
        if (isNaN(inputPrice, inputAmount)) {
            let modelError1 = {
                priceError: "Only enter numbers",
                amountError: "Only enter number"
            };
            res.render('insertProducts', { model: modelError1 });
        }
        let client = await MongoClient.connect(url);
        var ObjectID = require('mongodb').ObjectID;
        let condition = { "_id": ObjectID(inputId) };
        let dbo = client.db("atnstore");
        await dbo.collection("products").updateOne(condition, Change);
        res.redirect('/allProducts');
    }
})

app.listen(5000);
console.log("Server is running 5000")