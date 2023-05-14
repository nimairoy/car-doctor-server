const express = require('express');
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middlewares 
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is Running');
})



const uri = `mongodb+srv://${process.env.CARDOCTOR_USER}:${process.env.CARDOCTOR_PASS}@cluster0.as9pvg2.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


/////////// verify jwt token ////////////
const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if(!authorization){
      return res.status(401).send({error: true, message: 'unauthorized access'})
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded)=>{
      if(error){
        return res.status(401).send({error: true, message: 'Unauthorized access'})
      }
      req.decoded = decoded;
      next()
    })
}



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const carCollection = client.db("carDoctorDB").collection("car");
    const checkoutCollection = client.db("carDoctorDB").collection("checkout")

    // jwt json web token create
    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      console.log({ token })
      res.send({ token });
    })

    // read or get data from database
    app.get('/services', async (req, res) => {
      const cursor = carCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    //read or get single data 
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, img: 1, service_id: 1, price: 1 }
      }
      const result = await carCollection.findOne(query, options);
      res.send(result);
    })


    /**checkout start */

    // get data from checkout collection 
    app.get('/checkouts', verifyJwt, async (req, res) => {
      const decoded = req.decoded;
      console.log('come back after jwt verify', decoded)
      // console.log(req.headers.authorization)

      if(decoded.email !== req.query.email){
        return res.status(403).send({error: 1, message: 'forbidden access'})
      }


      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await checkoutCollection.find(query).toArray();
      res.send(result);
    })

    // create data or post method
    app.post('/checkouts', async (req, res) => {
      const checkout = req.body;
      console.log(checkout)
      const result = await checkoutCollection.insertOne(checkout);
      res.send(result);
    })

    // update checkout pages
    app.patch('/checkouts/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateCheckouts = req.body;
      console.log(updateCheckouts)
      const updateDoc = {
        $set: {
          status: updateCheckouts.status,
        }
      }
      const result = await checkoutCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // delete checkout list
    app.delete('/checkouts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await checkoutCollection.deleteOne(query);
      res.send(result);
    })

    /**checkout end */



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.listen(port, () => {
  console.log('Server is Running on port: ', port);
})