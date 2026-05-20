const CRYPTO_KEY = "CosmicPixelSecureAppleByokXorKey";

/**
 * Obfuscates plain text API keys with a lightweight XOR cipher and Base64.
 * Prevents plain text scanning in localStorage/IndexedDB.
 */
function obfuscate(text) {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    // XOR logic with our static key
    const charCode = text.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
    result += String.fromCharCode(charCode);
  }
  // Convert to Base64 using standard btoa with UTF-8 support
  return btoa(encodeURIComponent(result));
}

/**
 * Reverses the obfuscation to retrieve the original plain text API key.
 */
function deobfuscate(cipherText) {
  if (!cipherText) return "";
  try {
    const decoded = decodeURIComponent(atob(cipherText));
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ CRYPTO_KEY.charCodeAt(i % CRYPTO_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    console.error("Deobfuscation failed. Invalid key format.", error);
    return "";
  }
}
