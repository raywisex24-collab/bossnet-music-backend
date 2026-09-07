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
const admin = require("../config/firebaseAdmin");

const router = express.Router();
async function authenticateUser(req, res) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return null;
    }

    const idToken = authHeader.split("Bearer ")[1];

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    return decodedToken;
  } catch (error) {
    console.error("Firebase authentication error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });

    return null;
  }
}

// Allowed audio formats
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",

  // WAV
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",

  // M4A / AAC
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/x-aac",

  // OGG / Opus
  "audio/ogg",
  "audio/opus",
  "audio/ogg; codecs=opus",

  // FLAC
  "audio/flac",
  "audio/x-flac",

  // WebM audio
  "audio/webm",

  // AIFF
  "audio/aiff",
  "audio/x-aiff",
];

// Common audio file extensions
const ALLOWED_AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "wave",
  "m4a",
  "aac",
  "ogg",
  "oga",
  "opus",
  "flac",
  "webm",
  "aiff",
  "aif",
];

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// ==========================================
// INCREMENT PLAY COUNT
// ==========================================

router.post("/play-count", async (req, res) => {
  try {
    const user = await authenticateUser(req, res);

    if (!user) return;

    const { songId } = req.body;

    if (!songId) {
      return res.status(400).json({
        success: false,
        message: "Song ID is required",
      });
    }

    const db = admin.firestore();
    const songRef = db.collection("music").doc(songId);

    const songSnap = await songRef.get();

    if (!songSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "Song not found",
      });
    }

await songRef.update({
  plays: admin.FieldValue.increment(1),
});

    return res.json({
      success: true,
      message: "Play count updated",
    });
  } catch (error) {
    console.error("Failed to update play count:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update play count",
    });
  }
});

// ==========================================
// CREATE UPLOAD URL
// ==========================================

router.post("/upload-url", async (req, res) => {
  try {
    const user = await authenticateUser(req, res);

    if (!user) return;

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


// Validate audio format using both MIME type and file extension.
// Different browsers/devices can report different MIME types
// for the same audio format.

const extension =
  fileName
    .split(".")
    .pop()
    ?.toLowerCase() || "";

const normalizedContentType =
  contentType
    .split(";")[0]
    .trim()
    .toLowerCase();

const isAllowedAudioType =
  ALLOWED_AUDIO_TYPES.includes(normalizedContentType);

const isAllowedAudioExtension =
  ALLOWED_AUDIO_EXTENSIONS.includes(extension);

if (!isAllowedAudioType && !isAllowedAudioExtension) {
  return res.status(400).json({
    success: false,
    message:
      "Unsupported audio format. Supported formats: MP3, WAV, M4A, AAC, OGG, Opus, FLAC, WebM, and AIFF.",
  });
}

    // Generate unique ID
    const songId = crypto.randomUUID();


   const userId = user.uid;

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
    const user = await authenticateUser(req, res);

    if (!user) return;

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

    const userId = user.uid;

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
    const user = await authenticateUser(req, res);

    if (!user) return;

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
    const user = await authenticateUser(req, res);

    if (!user) return;
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
