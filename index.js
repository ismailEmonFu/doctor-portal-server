const express = require('express');
const app = express();
const cors = require('cors');
var admin = require("firebase-admin");
require('dotenv').config();
const { MongoClient, CURSOR_FLAGS } = require('mongodb');
const port = process.env.PORT || 5000;

// middlewire
app.use(cors());
app.use(express.json());

//doctor-portal-firebase-adminsdk

var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ozmv8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization.startsWith('Bearer ')) {
        const token = req.headers.authorization?.split(' ')[1];
        console.log(token);
    }

    try {
        const decodedUser = await admin.auth().verifyIdToken(token);
        req.decodedEmail = decodedUser.email;
    }
    catch {

    }

    next();
}


async function run() {

    try {
        await client.connect();

        const database = client.db("doctor_portal");
        const appointmentCollection = database.collection("appointment");
        const usersCollection = database.collection("users");

        app.get('/myappoin', async (req, res) => {
            // To get all data without any query
            const allData = appointmentCollection.find({});
            const appointments = await allData.toArray();
            res.json(appointments);
        })

        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            // const date = new Date(req.query.date).toLocaleDateString();
            // console.log(req.query.date);
            const date = req.query.date;
            const query = { email: email, date: date }

            const allData = appointmentCollection.find(query);
            const appointments = await allData.toArray();
            // console.log(appointments);
            res.json(appointments);
            // To get all data without any query
            // const allData = appointmentCollection.find({});
            // const appointments = await allData.toArray();
            // res.json(appointments);
        })


        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentCollection.insertOne(appointment);
            console.log(result);
            res.json(result);
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            console.log(user);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })


        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            console.log('decoded mail: ', req.decodedEmail);
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });

                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }

            else {
                res.status(403).json({ message: 'Sorry, sir. you do not have permission to do this.' });
            }

        })

    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})