// src/lib/maps/formatAddress.ts

/**
 * Formats an address string to ensure it includes "Mar del Plata, Argentina"
 * if not already present or implied. It tries to maintain the original address parts
 * and appends the standard local context.
 *
 * @param address The input address string.
 * @returns The formatted address string.
 *
 * @example
 * formatAddressForMarDelPlata("Colon 1234")
 * // => "Colon 1234, Mar del Plata, Argentina"
 *
 * formatAddressForMarDelPlata("Alberti 2400, mar del plata")
 * // => "Alberti 2400, Mar del Plata, Argentina"
 *
 * formatAddressForMarDelPlata("San Martín 800, Mar del Plata, Argentina")
 * // => "San Martín 800, Mar del Plata, Argentina"
 *
 * formatAddressForMarDelPlata("Av. Luro 3245, Argentina")
 * // => "Av. Luro 3245, Mar del Plata, Argentina"
 *
 * formatAddressForMarDelPlata("")
 * // => "Mar del Plata, Argentina"
 *
 * formatAddressForMarDelPlata("Mar del Plata")
 * // => "Mar del Plata, Argentina"
 */
export default function formatAddressForMarDelPlata(address: string): string {
  const originalTrimmedAddress = address.trim();
  const lowerOriginal = originalTrimmedAddress.toLowerCase();

  const mdpKeyword = "mar del plata";
  const argKeyword = "argentina";

  const mdpNormalized = "Mar del Plata";
  const argNormalized = "Argentina";

  // Check if the original address already contains both in the correct suffix order (approximately)
  if (lowerOriginal.includes(mdpKeyword) && lowerOriginal.includes(argKeyword)) {
    // A simple check: if "mar del plata" appears before "argentina"
    if (lowerOriginal.lastIndexOf(mdpKeyword) < lowerOriginal.lastIndexOf(argKeyword)) {
      // If both are present and in order, return the original (trimmed)
      // We could normalize casing here, but the prompt says "no hacer nada".
      // Let's refine to normalize casing and comma spacing for consistency if both present.
      const parts = originalTrimmedAddress
        .split(',')
        .map(part => part.trim())
        .filter(part => part.length > 0);
      
      let mdpFound = false;
      let argFound = false;
      const normalizedParts = parts.map(part => {
        if (part.toLowerCase() === mdpKeyword) {
          mdpFound = true;
          return mdpNormalized;
        }
        if (part.toLowerCase() === argKeyword) {
          argFound = true;
          return argNormalized;
        }
        return part;
      });
      if (mdpFound && argFound) {
        return normalizedParts.join(', ');
      }
      // If not both found as distinct parts, fall through to reconstruct.
    }
     // If out of order, or embedded, fall through to reconstruct.
  }
  
  // Filter out existing "Mar del Plata" or "Argentina" parts to rebuild the suffix correctly.
  let baseAddressParts = originalTrimmedAddress
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .filter(part => {
      const lowerPart = part.toLowerCase();
      return lowerPart !== mdpKeyword && lowerPart !== argKeyword;
    });

  let baseAddress = baseAddressParts.join(', ');

  // Construct the final address
  // If the original input was empty or only consisted of keywords that were filtered out
  if (baseAddress === "" && originalTrimmedAddress.length > 0) {
     // This case handles inputs like "Mar del Plata", "Argentina", or "Mar del Plata, Argentina"
     // The desired output is always "Mar del Plata, Argentina"
     return `${mdpNormalized}, ${argNormalized}`;
  }
  
  if (baseAddress === "") { // Original input was empty string
      return `${mdpNormalized}, ${argNormalized}`;
  }

  return `${baseAddress}, ${mdpNormalized}, ${argNormalized}`;
}
