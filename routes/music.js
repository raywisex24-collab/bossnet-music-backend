const express = require("express");
const crypto = require("crypto");

const {
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

const b2 = require("../config/b2");

const router = express.Router();


// Allowed audio formats
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/mp4",
];

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


// ==========================================
// CREATE UPLOAD URL
// ==========================================

router.post("/upload-url", async (req, res) => {
  try {
    const {
      fileName,
      contentType,
    } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({
        success: false,
        message: "fileName and contentType are required",
      });
    }


    // Make sure it's an audio file
    if (!ALLOWED_AUDIO_TYPES.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported audio format",
      });
    }


    // Get extension
    const extension =
      fileName
        .split(".")
        .pop()
        ?.toLowerCase() || "mp3";


    // Generate unique ID
    const songId = crypto.randomUUID();


    /*
      Temporary user ID for testing.

      Later this will come from
      Bossnet authentication.
    */

    const userId = "development-user";


    // File location inside B2
    const key =
      `music/${userId}/${songId}.${extension}`;


    const command = new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });


    // URL expires after 15 minutes
    const uploadUrl =
      await getSignedUrl(
        b2,
        command,
        {
          expiresIn: 15 * 60,
        }
      );


    return res.json({
      success: true,
      songId,
      key,
      uploadUrl,
    });

  } catch (error) {

    console.error(
      "B2 upload URL error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create upload URL",
    });
  }
});


// ==========================================
// CREATE PLAYBACK URL
// ==========================================

router.post("/cover-upload-url", async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({
        success: false,
        message: "fileName and contentType are required",
      });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported image format. Use JPG, PNG, or WebP.",
      });
    }

    const extension =
      fileName.split(".").pop()?.toLowerCase() || "jpg";

    const coverId = crypto.randomUUID();

    // Temporary testing user ID; later replace with authenticated Firebase UID.
    const userId = "development-user";

    const key = `music/${userId}/covers/${coverId}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(
      b2,
      command,
      { expiresIn: 15 * 60 }
    );

    return res.json({
      success: true,
      coverId,
      key,
      uploadUrl,
    });
  } catch (error) {
    console.error("B2 cover upload URL error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create cover upload URL",
    });
  }
});

router.post("/play-url", async (req, res) => {
  try {

    const {
      key,
    } = req.body;


    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Audio key is required",
      });
    }


    const command =
      new GetObjectCommand({
        Bucket:
          process.env.B2_BUCKET_NAME,

        Key: key,
      });


    // Temporary streaming URL
    const playUrl =
      await getSignedUrl(
        b2,
        command,
        {
          expiresIn: 60 * 60,
        }
      );


    return res.json({
      success: true,
      playUrl,
    });

  } catch (error) {

    console.error(
      "B2 play URL error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create playback URL",
    });
  }
});


router.post("/cover-url", async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Cover key is required",
      });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: key,
    });

    const coverUrl = await getSignedUrl(
      b2,
      command,
      { expiresIn: 60 * 60 }
    );

    return res.json({
      success: true,
      coverUrl,
    });
  } catch (error) {
    console.error("B2 cover URL error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create cover URL",
    });
  }
});

module.exports = router;
