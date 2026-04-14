import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { customAlphabet } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");

const nanoid = customAlphabet("1234567890abcdef", 24);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class LocalCollection {
  constructor(name) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  _read() {
    try {
      const data = fs.readFileSync(this.filePath, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  _write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  async find(query = {}, options = {}) {
    let results = this._read();
    
    // Filter
    for (const key in query) {
      results = results.filter((item) => item[key] === query[key]);
    }

    // Sort
    if (options.sort) {
      const sortKey = Object.keys(options.sort)[0];
      const sortDir = options.sort[sortKey];
      results.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return sortDir === -1 ? 1 : -1;
        if (a[sortKey] > b[sortKey]) return sortDir === -1 ? -1 : 1;
        return 0;
      });
    }

    // Skip & Limit
    const skip = options.skip || 0;
    const limit = options.limit || results.length;
    
    return results.slice(skip, skip + limit);
  }

  async findOne(query = {}) {
    const results = await this.find(query);
    const item = results[0] || null;
    if (item) {
      const self = this;
      item.save = async function() {
        return self.findByIdAndUpdate(this.id || this._id, this);
      };
      item.toObject = function() {
        const { toObject, save, ...rest } = this;
        return rest;
      };
    }
    return item;
  }

  async findById(id) {
    const results = this._read();
    const item = results.find((item) => item.id === id || item._id === id) || null;
    if (item) {
      const self = this;
      item.save = async function() {
        return self.findByIdAndUpdate(this.id || this._id, this);
      };
      item.toObject = function() {
        const { toObject, save, ...rest } = this;
        return rest;
      };
    }
    return item;
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const results = this._read();
    const index = results.findIndex((item) => item.id === id || item._id === id);
    if (index === -1) return null;
    
    results[index] = { ...results[index], ...update, updatedAt: new Date().toISOString() };
    this._write(results);
    return results[index];
  }

  async findByIdAndDelete(id) {
    let results = this._read();
    const item = results.find((item) => item.id === id || item._id === id);
    if (!item) return null;
    results = results.filter((item) => item.id !== id && item._id !== id);
    this._write(results);
    return item;
  }

  async deleteOne(query = {}) {
    let results = this._read();
    const index = results.findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    if (index === -1) return null;
    const removed = results.splice(index, 1);
    this._write(results);
    return removed[0];
  }

  async create(data) {
    const results = this._read();
    const self = this;
    const newItem = {
      id: nanoid(),
      _id: nanoid(), // Keep for compatibility with front-end expecting _id
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add a simple toObject for mongoose compatibility
      toObject: function() { 
        const { toObject, save, ...rest } = this;
        return rest;
      },
      save: async function() {
        return self.findByIdAndUpdate(this.id || this._id, this);
      }
    };
    results.push(newItem);
    this._write(results);
    return newItem;
  }

  async countDocuments(query = {}) {
    const results = await this.find(query);
    return results.length;
  }

  async distinct(field) {
    const results = this._read();
    const values = results.map(item => item[field]).filter(Boolean);
    return [...new Set(values)];
  }
}

const db = {
  collection: (name) => new LocalCollection(name)
};

export default db;
