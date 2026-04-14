import db from "../utils/localDB.js";

const collection = db.collection("certificates");

const Certificate = {
  find: (query, options) => collection.find(query, options),
  findOne: (query) => collection.findOne(query),
  findById: (id) => collection.findById(id),
  create: (data) => collection.create(data),
  countDocuments: (query) => collection.countDocuments(query),
  deleteOne: (query) => collection.deleteOne(query),
  distinct: (field) => collection.distinct(field),
  findByIdAndUpdate: (id, update) => collection.findByIdAndUpdate(id, update),
};

export default Certificate;
