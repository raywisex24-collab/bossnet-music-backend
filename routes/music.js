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


module.exports = router;
