/**
 * @fileoverview IBM Cloud Object Storage Service
 * @module services/ibmCosService
 * @description Handles document uploads to IBM Cloud Object Storage
 */

const AWS = require('ibm-cos-sdk');
const fs = require('fs').promises;
const path = require('path');

/**
 * IBM Cloud Object Storage Service Class
 * Manages document uploads to IBM COS using S3-compatible API
 * @class
 */
class IBMCosService {
  constructor() {
    this.bucketName = process.env.IBM_COS_BUCKET_NAME || 'loan-documents';
    const endpoint = process.env.IBM_COS_ENDPOINT || 's3.us-south.cloud-object-storage.appdomain.cloud';
    
    // Initialize COS client
    if (process.env.IBM_COS_API_KEY && process.env.IBM_COS_INSTANCE_ID) {
      this.cosClient = new AWS.S3({
        endpoint: `https://${endpoint}`,
        apiKeyId: process.env.IBM_COS_API_KEY,
        ibmAuthEndpoint: 'https://iam.cloud.ibm.com/identity/token',
        serviceInstanceId: process.env.IBM_COS_INSTANCE_ID,
        signatureVersion: 'iam',
      });
      
      this.config = {
        endpoint: endpoint,
        apiKeyId: process.env.IBM_COS_API_KEY,
        serviceInstanceId: process.env.IBM_COS_INSTANCE_ID
      };
    } else {
      console.warn('IBM COS credentials not configured. Upload functionality will be disabled.');
      this.cosClient = null;
      this.config = {};
    }
  }

  /**
   * Check if COS is configured
   * @returns {boolean} True if COS is configured
   */
  isConfigured() {
    return this.cosClient !== null;
  }

  /**
   * Create bucket if it doesn't exist
   * @async
   * @returns {Promise<boolean>} True if bucket exists or was created
   */
  async ensureBucket() {
    if (!this.isConfigured()) {
      throw new Error('IBM COS is not configured');
    }

    try {
      // Check if bucket exists
      await this.cosClient.headBucket({ Bucket: this.bucketName }).promise();
      console.log(`Bucket ${this.bucketName} already exists`);
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        // Bucket doesn't exist, create it
        try {
          await this.cosClient.createBucket({
            Bucket: this.bucketName,
            CreateBucketConfiguration: {
              LocationConstraint: 'us-south-standard'
            }
          }).promise();
          console.log(`Bucket ${this.bucketName} created successfully`);
          return true;
        } catch (createError) {
          console.error('Error creating bucket:', createError);
          throw createError;
        }
      } else {
        console.error('Error checking bucket:', error);
        throw error;
      }
    }
  }

  /**
   * Upload a file to IBM COS from buffer
   * @async
   * @param {string} objectKey - Object key in COS (path in bucket)
   * @param {Buffer} buffer - File buffer
   * @param {string} contentType - MIME type
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} Upload result with URL and metadata
   */
  async uploadBuffer(objectKey, buffer, contentType, metadata = {}) {
    if (!this.isConfigured()) {
      throw new Error('IBM COS is not configured');
    }

    try {
      // Ensure bucket exists
      await this.ensureBucket();

      // Upload parameters
      const uploadParams = {
        Bucket: this.bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          uploadDate: new Date().toISOString(),
          ...metadata
        }
      };

      // Upload file
      const result = await this.cosClient.upload(uploadParams).promise();

      console.log(`File uploaded successfully: ${objectKey}`);

      return {
        success: true,
        location: result.Location,
        bucket: result.Bucket,
        key: result.Key,
        etag: result.ETag,
        url: this.getPublicUrl(objectKey),
        metadata: uploadParams.Metadata
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Upload a file to IBM COS from file path
   * @async
   * @param {string} filePath - Local file path
   * @param {string} objectKey - Object key in COS (path in bucket)
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} Upload result with URL and metadata
   */
  async uploadFile(filePath, objectKey, metadata = {}) {
    if (!this.isConfigured()) {
      throw new Error('IBM COS is not configured');
    }

    try {
      // Ensure bucket exists
      await this.ensureBucket();

      // Read file
      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(filePath);

      // Determine content type
      const contentType = this.getContentType(fileExtension);

      // Upload parameters
      const uploadParams = {
        Bucket: this.bucketName,
        Key: objectKey,
        Body: fileContent,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadDate: new Date().toISOString(),
          ...metadata
        }
      };

      // Upload file
      const result = await this.cosClient.upload(uploadParams).promise();

      console.log(`File uploaded successfully: ${objectKey}`);

      return {
        success: true,
        location: result.Location,
        bucket: result.Bucket,
        key: result.Key,
        etag: result.ETag,
        url: this.getPublicUrl(objectKey),
        metadata: uploadParams.Metadata
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   * @async
   * @param {Array<Object>} files - Array of {filePath, objectKey, metadata}
   * @returns {Promise<Array<Object>>} Array of upload results
   */
  async uploadMultipleFiles(files) {
    if (!this.isConfigured()) {
      throw new Error('IBM COS is not configured');
    }

    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.uploadFile(
          file.filePath,
          file.objectKey,
          file.metadata || {}
        );
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          filePath: file.filePath,
          objectKey: file.objectKey,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Download a file from IBM COS
   * @async
   * @param {string} objectKey - Object key in COS
   * @param {string} downloadPath - Local path to save file
   * @returns {Promise<Object>} Download result
   */
  async downloadFile(objectKey, downloadPath) {
    if (!this.isConfigured()) {
      throw new Error('IBM COS is not configured');
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Key: objectKey
      };

      const data = await this.cosClient.getObject(params).promise();
      await fs.writeFile(downloadPath, data.Body);

      console.log(`File downloaded successfully: ${objectKey}`);

      return {
        success: true,
        objectKey,
        downloadPath,
        contentType: data.ContentType,
        metadata: data.Metadata
      };
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Delete a file from IBM COS
   * @async
   * @param {string} objectKey - Object key in COS
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(objectKey) {
    if (!this.isConfigured()) {
      throw new Error('IBM COS is not configured');
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Key: objectKey
      };

      await this.cosClient.deleteObject(params).promise();

      console.log(`File deleted successfully: ${objectKey}`);

      return {
        success: true,
        objectKey
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * List files in bucket
   * @async
   * @param {string} prefix - Optional prefix to filter files
   * @returns {Promise<Array<Object>>} Array of file objects
   */
  async listFiles(prefix = '') {
    if (!this.isConfigured()) {
      throw new Error('IBM COS is not configured');
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Prefix: prefix
      };

      const data = await this.cosClient.listObjectsV2(params).promise();

      return data.Contents.map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        etag: item.ETag,
        url: this.getPublicUrl(item.Key)
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   * @async
   * @param {string} objectKey - Object key in COS
   * @returns {Promise<Object>} File metadata
   */
  async getFileMetadata(objectKey) {
    if (!this.isConfigured()) {
      throw new Error('IBM COS is not configured');
    }

    try {
      const params = {
        Bucket: this.bucketName,
        Key: objectKey
      };

      const data = await this.cosClient.headObject(params).promise();

      return {
        contentType: data.ContentType,
        contentLength: data.ContentLength,
        lastModified: data.LastModified,
        etag: data.ETag,
        metadata: data.Metadata
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Generate a presigned URL for temporary access
   * For IBM COS with IAM auth, we return the public URL
   * Access control is managed through bucket policies
   * @async
   * @param {string} objectKey - Object key in COS
   * @param {number} expiresIn - Expiration time in seconds (default: 3600)
   * @returns {Promise<string>} Public URL
   */
  async getPresignedUrl(objectKey, expiresIn = 3600) {
    if (!this.isConfigured()) {
      throw new Error('IBM COS is not configured');
    }

    try {
      // For IBM COS with IAM authentication, return public URL
      // The bucket should have public read access or use IAM policies
      return this.getPublicUrl(objectKey);
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw error;
    }
  }

  /**
   * Get public URL for an object
   * @param {string} objectKey - Object key in COS
   * @returns {string} Public URL
   */
  getPublicUrl(objectKey) {
    return `https://${this.bucketName}.${this.config.endpoint}/${objectKey}`;
  }

  /**
   * Get content type based on file extension
   * @param {string} extension - File extension
   * @returns {string} Content type
   */
  getContentType(extension) {
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip'
    };

    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Upload actor documents to COS
   * @async
   * @param {string} actorUsername - Actor username
   * @param {Object} documentPaths - Object containing paths to generated documents
   * @returns {Promise<Object>} Upload results
   */
  async uploadActorDocuments(actorUsername, documentPaths) {
    if (!this.isConfigured()) {
      console.warn('IBM COS not configured. Skipping upload.');
      return {
        success: false,
        message: 'IBM COS not configured',
        documents: {}
      };
    }

    const files = [];
    const documentTypes = [
      'bankStatement',
      'financialStatement',
      'idDocument',
      'collateralProof',
      'businessRegistration',
      'taxReturn'
    ];

    // Prepare files for upload
    for (const docType of documentTypes) {
      if (documentPaths[docType]) {
        files.push({
          filePath: documentPaths[docType],
          objectKey: `actors/${actorUsername}/${docType}.pdf`,
          metadata: {
            actorUsername,
            documentType: docType,
            generatedDate: new Date().toISOString()
          }
        });
      }
    }

    // Upload all files
    const results = await this.uploadMultipleFiles(files);

    // Organize results by document type
    const uploadedDocuments = {};
    results.forEach((result, index) => {
      const docType = documentTypes[index];
      uploadedDocuments[docType] = result;
    });

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      success: failureCount === 0,
      message: `Uploaded ${successCount} documents, ${failureCount} failed`,
      totalFiles: files.length,
      successCount,
      failureCount,
      documents: uploadedDocuments
    };
  }
}

module.exports = new IBMCosService();

// Made with Bob