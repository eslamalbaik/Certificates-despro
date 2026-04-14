import db from "../utils/localDB.js";

const collection = db.collection("templates");

const Template = {
  find: (query) => collection.find(query),
  findOne: (query) => collection.findOne(query),
  create: (data) => collection.create(data),
  findById: (id) => collection.findById(id),
};

export default Template;
