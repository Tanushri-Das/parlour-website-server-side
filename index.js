const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion ,ObjectId} = require("mongodb");

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tdjlbxg.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const servicesCollection = client.db("parlourWebsite").collection("services");
    const bookingsCollection = client.db("parlourWebsite").collection("bookings");
    const reviewsCollection = client.db("parlourWebsite").collection("reviews");
    const usersCollection = client.db("parlourWebsite").collection("users");

    app.get("/services", async (req, res) => {
      const result = await servicesCollection.find().toArray();
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
        const newItem = req.body;
        const result = await bookingsCollection.insertOne(newItem);
        res.send(result);
    });

    app.get("/bookings", async (req, res) => {
        const result = await bookingsCollection.find().toArray();
        res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingsCollection.deleteOne(query);
        res.send(result);
    });

    app.post("/reviews", async (req, res) => {
        const newItem = req.body;
        const result = await reviewsCollection.insertOne(newItem);
        res.send(result);
    });

    app.get("/reviews", async (req, res) => {
        const result = await reviewsCollection.find().toArray();
        res.send(result);
    });

  // users related apis

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      console.log("existingUser", existingUser);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    

  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Parlour website server side is running");
});
app.listen(port, () => {
  console.log(`Parlour website server side running on port ${port}`);
});
