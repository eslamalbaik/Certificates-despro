import bidiFactory from "bidi-js";
import arabicReshaper from "arabic-reshaper";
const { reshape } = arabicReshaper;

const bidi = bidiFactory();

/**
 * Shapes Arabic text for PDF rendering.
 * 1. Reshapes characters (joining letters).
 * 2. Reorders text for Right-to-Left (Bidi).
 * @param {string} input 
 * @returns {string}
 */
export function shapeArabic(input) {
  if (!input) return "";
  try {
    // 1. Reshape Arabic letters
    const reshaped = reshape(input);
    
    // 2. Reorder for RTL
    const bidiText = bidi.getReorderedText(reshaped);
    
    return bidiText;
  } catch (err) {
    console.error("Arabic shaping error:", err);
    return input; // Fallback to original
  }
}
