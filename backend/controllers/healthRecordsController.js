import memberModel from "../models/memberModel.js";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from 'crypto';

// Initialize S3 client with R2 credentials
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  }
});

// Create a new family member
export const createMember = async (req, res) => {
  try {
    const { name, relation } = req.body;
    const userId = req.user._id;

    // Check if member with same relation already exists
    const existingMember = await memberModel.findOne({ userId, name, relation });
    if (existingMember) {
      return res.json({ success: false, message: "Member with this name and relation already exists" });
    }

    const newMember = await memberModel.create({
      userId,
      name,
      relation,
      cases: []
    });

    res.json({ success: true, member: newMember });
  } catch (error) {
    console.error("Error creating member:", error);
    res.json({ success: false, message: error.message });
  }
};

// Get all members for a user
export const getMembers = async (req, res) => {
  try {
    const userId = req.user._id;
    const members = await memberModel.find({ userId });
    res.json({ success: true, members });
  } catch (error) {
    console.error("Error getting members:", error);
    res.json({ success: false, message: error.message });
  }
};

// Create a new case for a member
export const createCase = async (req, res) => {
  try {
    const { memberId, name, description } = req.body;
    const userId = req.user._id;

    // Find the member and verify ownership
    const member = await memberModel.findOne({ _id: memberId, userId });
    if (!member) {
      return res.json({ success: false, message: "Member not found or access denied" });
    }

    // Add the new case
    member.cases.push({ name, description, files: [] });
    await member.save();

    res.json({ success: true, member });
  } catch (error) {
    console.error("Error creating case:", error);
    res.json({ success: false, message: error.message });
  }
};

// Get a presigned URL for file upload
export const getUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    const userId = req.user._id;
    
    // Generate a unique file key to avoid collisions
    const fileKey = `${userId}/${crypto.randomBytes(16).toString('hex')}-${fileName}`;
    
    // Create a command to put an object in the bucket
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType
    });
    
    // Generate a presigned URL
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.json({
      success: true,
      uploadUrl: signedUrl,
      fileKey,
      publicUrl: `${process.env.R2_PUBLIC_URL}/${fileKey}`
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.json({ success: false, message: error.message });
  }
};

// Add a file to a case
export const addFile = async (req, res) => {
  try {
    const { memberId, caseId, name, url, type, hospital, doctor, date } = req.body;
    const userId = req.user._id;

    // Find the member and verify ownership
    const member = await memberModel.findOne({ _id: memberId, userId });
    if (!member) {
      return res.json({ success: false, message: "Member not found or access denied" });
    }

    // Find the case
    const caseObj = member.cases.id(caseId);
    if (!caseObj) {
      return res.json({ success: false, message: "Case not found" });
    }

    // Add the file
    caseObj.files.push({
      name,
      url,
      type,
      hospital,
      doctor,
      date: new Date(date)
    });
    
    await member.save();
    res.json({ success: true, member });
  } catch (error) {
    console.error("Error adding file:", error);
    res.json({ success: false, message: error.message });
  }
};

// Delete a file
export const deleteFile = async (req, res) => {
  try {
    const { memberId, caseId, fileId, fileKey } = req.body;
    const userId = req.user._id;

    // Find the member and verify ownership
    const member = await memberModel.findOne({ _id: memberId, userId });
    if (!member) {
      return res.json({ success: false, message: "Member not found or access denied" });
    }

    // Find the case
    const caseObj = member.cases.id(caseId);
    if (!caseObj) {
      return res.json({ success: false, message: "Case not found" });
    }

    // Remove the file from the database
    caseObj.files.pull(fileId);
    await member.save();

    // Delete from R2 storage if fileKey provided
    if (fileKey) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey
      });
      
      await s3Client.send(deleteCommand);
    }

    res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.json({ success: false, message: error.message });
  }
};

// Get a single member with all details
export const getMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const userId = req.user._id;

    const member = await memberModel.findOne({ _id: memberId, userId });
    if (!member) {
      return res.json({ success: false, message: "Member not found or access denied" });
    }

    res.json({ success: true, member });
  } catch (error) {
    console.error("Error getting member:", error);
    res.json({ success: false, message: error.message });
  }
};