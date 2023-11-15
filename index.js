const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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

    const servicesCollection = client
      .db("parlourWebsite")
      .collection("services");
    const bookingsCollection = client
      .db("parlourWebsite")
      .collection("bookings");
    const reviewsCollection = client.db("parlourWebsite").collection("reviews");
    const usersCollection = client.db("parlourWebsite").collection("users");
    const paymentCollection = client.db("parlourWebsite").collection("payments");
    const contactsCollection = client.db("parlourWebsite").collection("contacts");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "8h",
      });
      res.send({ token });
    });
    // warning : use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    app.get("/services", async (req, res) => {
      const result = servicesCollection.find().toArray();
      res.send(result);
    });
    app.post("/services", verifyJWT, verifyAdmin, async (req, res) => {
      const newService = req.body;
      const result = await servicesCollection.insertOne(newService);
      res.send(result);
    });
    app.put("/services/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedData = req.body; // Get the updated data from the request body
      const result = await servicesCollection.updateOne(filter, {
        $set: updatedData,
      });
      console.log(result);

      // Check if the update was successful and send a response accordingly
      if (result.matchedCount > 0 && result.modifiedCount > 0) {
        // The update was successful
        res.status(200).json({ message: "Service updated successfully" });
      } else {
        // No matching document found or no changes made
        res.status(400).json({ message: "No service updated" });
      }
    });

    app.delete("/services/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/bookings", verifyJWT, async (req, res) => {
      const newItem = req.body;
      const result = await bookingsCollection.insertOne(newItem);
      res.send(result);
    });

    app.get("/bookings", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      const query = { email: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/orders", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await bookingsCollection.find().toArray();
      res.send(result);
    });
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/reviews", verifyJWT, async (req, res) => {
      const newItem = req.body;
      const result = await reviewsCollection.insertOne(newItem);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // users related apis

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
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

    // app.patch("/users/admin/:email",verifyJWT,verifyAdmin,async (req, res) => {
    //     const email = req.params.email;
    //     const filter = { email: new ObjectId(email) };
    //     const updatedDoc = {
    //       $set: {
    //         role: "admin",
    //       },
    //     };
    //     const result = await usersCollection.updateOne(filter, updatedDoc);
    //     res.send(result);
    //   }
    // );

    app.patch(
      "/users/admin/:email",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        const filter = { email: email }; // Use email directly, not ObjectId(email)
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // security layer : verifyJWT
    // email same
    // check admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // create payment
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;

      const amount = price * 100;
      console.log(price, amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment related api

    // app.post("/payments", verifyJWT, async (req, res) => {
    //   const payment = req.body;
    //   console.log(payment)
    //   const result = await paymentCollection.insertOne(payment);
    //   res.send(result);
    // });

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updateResult = await bookingsCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });

    // contacts related api

    app.post("/contacts", verifyJWT, async (req, res) => {
      const newItem = req.body;
      const result = await contactsCollection.insertOne(newItem);
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
