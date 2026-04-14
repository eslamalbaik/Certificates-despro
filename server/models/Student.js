import db from "../utils/localDB.js";

const collection = db.collection("students");

const Student = {
  findOne: (query) => collection.findOne(query),
  findById: (id) => collection.findById(id),
  find: (query) => collection.find(query),
  create: (data) => collection.create(data),
  findByIdAndUpdate: (id, data) => collection.findByIdAndUpdate(id, data),
  findByIdAndDelete: (id) => collection.findByIdAndDelete(id),
};

export default Student;
