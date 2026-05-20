const CRYPTO_KEY = "CosmicPixelSecureUniversalByokXorKey";
const OLD_CRYPTO_KEY = "CosmicPixelSecureAppleByokXorKey";

/**
 * Obfuscates plain text API keys with a lightweight XOR cipher and Base64.
 * Prevents plain text scanning in localStorage/IndexedDB.
 */
function obfuscate(text) {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(encodeURIComponent(result));
}

/**
 * Reverses the obfuscation to retrieve the original plain text API key.
 * Features auto-adaptive dual decryption to support seamless key migrations for existing users.
 */
function deobfuscate(cipherText) {
  if (!cipherText) return "";

  // 1. Attempt decryption with the new universal key
  let result = tryDeobfuscate(cipherText, CRYPTO_KEY);
  if (result && isPrintableASCII(result)) {
    return result;
  }

  // 2. Fallback to the old Apple key if decryption failed or resulted in garbage characters
  result = tryDeobfuscate(cipherText, OLD_CRYPTO_KEY);
  if (result && isPrintableASCII(result)) {
    return result;
  }

  return "";
}

/**
 * Helper to perform Base64 decode followed by XOR decryption.
 */
function tryDeobfuscate(cipherText, key) {
  try {
    const decoded = decodeURIComponent(atob(cipherText));
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    return null;
  }
}

/**
 * Validates if the decrypted string consists strictly of printable ASCII characters [32, 126].
 * Wrong XOR keys invariably decrypt into non-printable control characters.
 */
function isPrintableASCII(str) {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 32 || code > 126) {
      return false;
    }
  }
  return true;
}
