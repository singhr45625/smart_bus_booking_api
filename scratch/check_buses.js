const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Bus = require('./models/Bus');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const counts = await Bus.aggregate([
      { $group: { _id: { source: "$source", destination: "$destination" }, count: { $sum: 1 } } }
    ]);
    console.log('Bus Route Counts:', JSON.stringify(counts, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
