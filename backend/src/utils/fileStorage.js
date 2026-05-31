/**
 * @fileoverview File Storage Utility - JSON file-based data persistence
 * @module utils/fileStorage
 * @description Provides a simple file-based storage system using JSON files.
 * Handles CRUD operations with automatic backup creation and error handling.
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * File Storage Class
 * Manages JSON file-based data storage for the application
 * @class
 */
class FileStorage {
  /**
   * Create a FileStorage instance
   * @param {string} [dataDir] - Directory path for data files (defaults to ../../data)
   */
  constructor(dataDir = path.join(__dirname, '../../data')) {
    this.dataDir = dataDir;
    this.files = {
      users: path.join(dataDir, 'users.json'),
      applications: path.join(dataDir, 'applications.json'),
      documents: path.join(dataDir, 'documents.json'),
      analyses: path.join(dataDir, 'analyses.json'),
      decisions: path.join(dataDir, 'decisions.json'),
      auditLog: path.join(dataDir, 'audit_log.json'),
      agent_reviews: path.join(dataDir, 'agent_reviews.json')
    };
  }

  /**
   * Ensure data directory exists, create if it doesn't
   * @async
   * @private
   */
  async ensureDataDir() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  /**
   * Read data from a JSON file
   * @async
   * @param {string} fileKey - Key identifying the file (e.g., 'applications', 'users')
   * @returns {Promise<Array>} Parsed JSON data array, empty array if file doesn't exist
   * @throws {Error} If file read or parse fails
   */
  async read(fileKey) {
    try {
      await this.ensureDataDir();
      const filePath = this.files[fileKey];
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Write data to a JSON file
   * Creates a backup of existing file before writing
   * @async
   * @param {string} fileKey - Key identifying the file
   * @param {Array|Object} data - Data to write (will be JSON stringified)
   * @returns {Promise<boolean>} True if write successful
   * @throws {Error} If write fails
   */
  async write(fileKey, data) {
    try {
      await this.ensureDataDir();
      const filePath = this.files[fileKey];
      
      // Create backup before writing
      try {
        await fs.access(filePath);
        const backupPath = `${filePath}.backup`;
        await fs.copyFile(filePath, backupPath);
      } catch {
        // No existing file to backup
      }

      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error writing to ${fileKey}:`, error);
      throw error;
    }
  }

  /**
   * Append an item to a JSON file
   * @async
   * @param {string} fileKey - Key identifying the file
   * @param {Object} item - Item to append
   * @returns {Promise<Object>} The appended item
   */
  async append(fileKey, item) {
    const data = await this.read(fileKey);
    data.push(item);
    await this.write(fileKey, data);
    return item;
  }

  /**
   * Update an item in a JSON file by ID
   * Automatically adds updated_at timestamp
   * @async
   * @param {string} fileKey - Key identifying the file
   * @param {string} id - ID of item to update
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Object with old and new item versions
   * @throws {Error} If item not found
   */
  async update(fileKey, id, updates) {
    const data = await this.read(fileKey);
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Item with id ${id} not found in ${fileKey}`);
    }

    const oldItem = { ...data[index] };
    data[index] = { ...data[index], ...updates, updated_at: new Date().toISOString() };
    await this.write(fileKey, data);
    
    return { old: oldItem, new: data[index] };
  }

  /**
   * Delete an item from a JSON file by ID
   * @async
   * @param {string} fileKey - Key identifying the file
   * @param {string} id - ID of item to delete
   * @returns {Promise<boolean>} True if deletion successful
   * @throws {Error} If item not found
   */
  async delete(fileKey, id) {
    const data = await this.read(fileKey);
    const filtered = data.filter(item => item.id !== id);
    
    if (filtered.length === data.length) {
      throw new Error(`Item with id ${id} not found in ${fileKey}`);
    }

    await this.write(fileKey, filtered);
    return true;
  }

  /**
   * Find an item by ID
   * @async
   * @param {string} fileKey - Key identifying the file
   * @param {string} id - ID to search for
   * @returns {Promise<Object|undefined>} Found item or undefined
   */
  async findById(fileKey, id) {
    const data = await this.read(fileKey);
    return data.find(item => item.id === id);
  }

  /**
   * Find one item matching a predicate function
   * @async
   * @param {string} fileKey - Key identifying the file
   * @param {Function} predicate - Function to test each item
   * @returns {Promise<Object|undefined>} First matching item or undefined
   */
  async findOne(fileKey, predicate) {
    const data = await this.read(fileKey);
    return data.find(predicate);
  }

  /**
   * Find all items matching a predicate function
   * @async
   * @param {string} fileKey - Key identifying the file
   * @param {Function} [predicate] - Function to test each item (optional, returns all if omitted)
   * @returns {Promise<Array>} Array of matching items
   */
  async findMany(fileKey, predicate) {
    const data = await this.read(fileKey);
    return predicate ? data.filter(predicate) : data;
  }

  /**
   * Initialize file storage
   * Creates data directory and empty JSON files if they don't exist
   * @async
   */
  async initialize() {
    await this.ensureDataDir();
    
    // Initialize empty files if they don't exist
    for (const [key, filePath] of Object.entries(this.files)) {
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, '[]', 'utf8');
        console.log(`Initialized ${key}.json`);
      }
    }
  }
}

module.exports = new FileStorage();

// Made with Bob
