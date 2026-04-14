import db from "../utils/localDB.js";

const collection = db.collection("admins");

const Admin = {
  findOne: (query) => collection.findOne(query),
  findById: (id) => collection.findById(id),
  create: (data) => collection.create(data),
};

export default Admin;
