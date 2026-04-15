import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { customAlphabet } from "nanoid";
import { validationResult, body } from "express-validator";
import Certificate from "../models/Certificate.js";
import auth from "../middlewares/auth.js";
import { shapeArabic } from "../utils/arabicText.js";
import fixedTemplate from "../utils/fixedTemplate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL
  ? process.env.PUBLIC_BASE_URL.replace(/\/$/, "")
  : "";

const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL
  ? process.env.VERIFY_BASE_URL.replace(/\/$/, "")
  : `${PUBLIC_BASE_URL}/verify`;

const router = express.Router();

// Configure multer for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

const LOCAL_CERTS_DIR = path.join(__dirname, "..", "public", "certificates");

function ensureLocalDir(targetPath = LOCAL_CERTS_DIR) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
}

function buildLocalUrl(req, fileName) {
  const base = PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${base.replace(/\/$/, "")}/certificates/${fileName}`;
}

function resolveLocalPathFromUrl(url) {
  if (!url) return null;
  try {
    const relative = url.includes("/certificates/") 
      ? url.split("/certificates/")[1] 
      : url.replace(/^\/+/, "");
    return path.join(LOCAL_CERTS_DIR, relative);
  } catch {
    return null;
  }
}

async function removeCertificateAssets(cert) {
  if (!cert) return;
  const urls = new Set([cert.pdfUrl, cert.certificateUrl].filter(Boolean));
  for (const url of urls) {
    const localPath = resolveLocalPathFromUrl(url);
    if (localPath && fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
      } catch (err) {
        console.error("Failed to delete local file:", err);
      }
    }
  }
}

async function serializeCertificate(cert) {
  if (!cert) return null;
  const data = typeof cert.toObject === "function" ? cert.toObject() : { ...cert };
  // Since we use local storage, the URL in DB is already the correct public URL or relative path
  return data;
}

async function serializeCertificates(list) {
  return Promise.all(list.map((cert) => serializeCertificate(cert)));
}

// Routes

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const total = await Certificate.countDocuments();
    const certs = await Certificate.find({}, {
      sort: { createdAt: -1 },
      skip,
      limit
    });
    const data = await serializeCertificates(certs);
    res.json({
      data,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post(
  "/generate-fixed",
  auth,
  [
    body("traineeName").isString(),
    body("courseName").isString(),
    body("trainerName").isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { traineeName, courseName, trainerName, certificateNumber, issueDate: issueDateInput } = req.body;

      // Load template
      let templatePath = process.env.CERT_TEMPLATE_PATH || fixedTemplate.templatePath;
      if (templatePath && !path.isAbsolute(templatePath)) {
        templatePath = path.resolve(__dirname, "..", templatePath);
      }
      
      console.log(`[CertGen] Using template path: ${templatePath}`);
      if (!fs.existsSync(templatePath)) {
        console.error(`[CertGen] Template not found at: ${templatePath}`);
        return res.status(500).json({ message: "Template not found" });
      }

      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      pdfDoc.registerFontkit(fontkit);
      const page = pdfDoc.getPages()[0];

      // Load Font
      let fontPath = process.env.ARABIC_FONT_PATH || path.join(__dirname, "..", "fonts", "TraditionalArabic.ttf");
      if (fontPath && !path.isAbsolute(fontPath)) {
        fontPath = path.resolve(__dirname, "..", fontPath);
      }

      console.log(`[CertGen] Using font path: ${fontPath}`);
      if (!fs.existsSync(fontPath)) {
        console.error(`[CertGen] Font not found at: ${fontPath}`);
        return res.status(500).json({ message: "Font not found" });
      }
      const fontBytes = fs.readFileSync(fontPath);
      const arabicFont = await pdfDoc.embedFont(fontBytes);

      const blueColor = rgb(36/255, 36/255, 188/255); // #2424bc

      const drawRtL = (text, x, y, size, align) => {
        const shaped = shapeArabic(text);
        const textWidth = arabicFont.widthOfTextAtSize(shaped, size);
        let drawX = x;
        if (align === "right") drawX = x - textWidth;
        if (align === "center") drawX = x - textWidth / 2;
        page.drawText(shaped, { x: drawX, y, size, font: arabicFont, color: blueColor });
      };

      const { coords } = fixedTemplate;
      drawRtL(String(traineeName), coords.traineeName.x, coords.traineeName.y, coords.traineeName.size, coords.traineeName.align);
      drawRtL(String(courseName), coords.courseName.x, coords.courseName.y, coords.courseName.size, coords.courseName.align);
      drawRtL(String(trainerName), coords.trainerName.x, coords.trainerName.y, coords.trainerName.size, coords.trainerName.align);

      const generatedNumber = certificateNumber || customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 12)();
      const issueDate = issueDateInput ? new Date(issueDateInput) : new Date();
      const formattedDate = issueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

      drawRtL(generatedNumber, coords.certificateNumber.x, coords.certificateNumber.y, coords.certificateNumber.size, coords.certificateNumber.align);
      drawRtL(formattedDate, coords.issueDate.x, coords.issueDate.y, coords.issueDate.size, coords.issueDate.align);

      const verificationUrl = `${VERIFY_BASE_URL}?certificate=${generatedNumber}`;
      if (coords.verificationUrl) {
          drawRtL(PUBLIC_BASE_URL || "verify", coords.verificationUrl.x, coords.verificationUrl.y, coords.verificationUrl.size, coords.verificationUrl.align);
      }

      const pdfBytes = await pdfDoc.save();
      const fileName = `${generatedNumber}.pdf`;
      ensureLocalDir();
      fs.writeFileSync(path.join(LOCAL_CERTS_DIR, fileName), Buffer.from(pdfBytes));

      const pdfUrl = buildLocalUrl(req, fileName);

      const savedCert = await Certificate.create({
        studentName: traineeName,
        courseName,
        trainerName,
        certificateNumber: generatedNumber,
        pdfUrl,
        certificateUrl: pdfUrl,
        verificationUrl,
      });

      res.status(201).json({
        message: "تم إنشاء الشهادة بنجاح",
        ...savedCert.toObject(),
        downloadUrl: pdfUrl
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.get("/verify", async (req, res) => {
  const { certificate } = req.query;
  if (!certificate) return res.status(400).json({ message: "certificate is required" });
  try {
    const cert = await Certificate.findOne({ certificateNumber: certificate });
    if (!cert) return res.status(404).json({ message: "Not found" });
    res.json({ valid: true, certificate: await serializeCertificate(cert) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/search", async (req, res) => {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ message: "studentId is required" });
  try {
    const certs = await Certificate.find({ studentId });
    res.json(await serializeCertificates(certs));
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ message: "Not found" });
    await removeCertificateAssets(cert);
    await Certificate.deleteOne({ _id: req.params.id });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/stats", auth, async (req, res) => {
  try {
    const totalCerts = await Certificate.countDocuments();
    const certs = await Certificate.find({});
    const totalDownloads = certs.reduce((sum, c) => sum + (c.downloadCount || 0), 0);
    const uniqueStudents = (await Certificate.distinct("studentId")).length;
    res.json({ totalCerts, uniqueStudents: uniqueStudents || totalCerts, totalDownloads });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/track-download", async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ message: "Certificate not found" });

    const downloadEntry = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get("user-agent")
    };

    const newHistory = [...(cert.downloadHistory || []), downloadEntry];
    const newCount = (cert.downloadCount || 0) + 1;

    await Certificate.findByIdAndUpdate(req.params.id, {
      downloadCount: newCount,
      downloadHistory: newHistory
    });

    res.json({ message: "Download tracked", downloadCount: newCount });
  } catch (err) {
    console.error("Track download error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/stats/course-demand", auth, async (req, res) => {
  try {
    const certs = await Certificate.find({});
    const demand = {};

    certs.forEach(cert => {
      const course = cert.courseName || "غير محدد";
      demand[course] = (demand[course] || 0) + 1;
    });

    const data = Object.keys(demand).map(course => ({
      course,
      count: demand[course]
    })).sort((a, b) => b.count - a.count);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/stats/download-logs", auth, async (req, res) => {
  try {
    const certs = await Certificate.find({});
    let logs = [];

    certs.forEach(cert => {
      if (cert.downloadHistory && cert.downloadHistory.length > 0) {
        cert.downloadHistory.forEach(history => {
          logs.push({
            id: cert._id,
            studentName: cert.studentName,
            courseName: cert.courseName,
            timestamp: history.timestamp,
            certificateNumber: cert.certificateNumber,
            ip: history.ip,
            userAgent: history.userAgent
          });
        });
      }
    });

    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(logs.slice(0, 100)); // Last 100 logs
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id/download-history", auth, async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert) return res.status(404).json({ message: "Certificate not found" });
    res.json(cert.downloadHistory || []);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;