const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.port || 7000;
const { MongoClient, ServerApiVersion } = require('mongodb');

//middlewares
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    credentials: true
}));
app.use(express.json());

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qvjjrvn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const userCollection = client.db("shop-bazar").collection("users");
        const productCollection = client.db("shop-bazar").collection("products");
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        app.get('/products', async (req, res) => {
            const result = await productCollection.find().toArray();
            res.send(result);
        });

        app.get('/categories', async (req, res) => {
            try {
                const categories = await productCollection.aggregate([
                    {
                        $group: {
                            _id: "$category",
                            image: { $first: "$image" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            category: "$_id",
                            image: 1
                        }
                    }
                ]).toArray();

                res.send(categories);
            } catch (error) {
                res.status(500).json({ error: 'Failed to load categories' });
            }
        });


        app.post("/user-data", async (req, res) => {
            const { name, email, password } = req.body;
            try {
                const existing = await userCollection.findOne({ email });
                if (existing) {
                    return res.status(400).json({ message: "Email already exists" });
                }
                let hashedPassword = null;
                if (password) {
                    hashedPassword = await bcrypt.hash(password, 10);
                }

                const result = await userCollection.insertOne({ name, email, password: hashedPassword, createdAt: new Date(), });
                const userId = result.insertedId;
                const user = { name, email };
                const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "7d" });
                res.status(201).json({
                    token,
                    user: { id: userId, name, email, },
                });
            } catch (err) {
                console.error("Registration error:", err);
                res.status(500).json({ message: "Registration failed" });
            }
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('shop bazar is shopping');
});

app.listen(port, () => {
    console.log(`server is running on ${port}`);
});