// src/lib/maps/formatAddress.test.ts
import { describe, it, expect } from 'vitest';
import formatAddressForMarDelPlata from './formatAddress';

describe('formatAddressForMarDelPlata', () => {
  it('should append Mar del Plata and Argentina if both are missing', () => {
    expect(formatAddressForMarDelPlata("Colon 1234")).toBe("Colon 1234, Mar del Plata, Argentina");
  });

  it('should append Argentina if Mar del Plata is present but Argentina is missing, normalizing case', () => {
    expect(formatAddressForMarDelPlata("Alberti 2400, mar del plata")).toBe("Alberti 2400, Mar del Plata, Argentina");
  });

  it('should append Argentina if Mar del Plata (with different casing) is present but Argentina is missing', () => {
    expect(formatAddressForMarDelPlata("Moreno 555, Mar del Plata ")).toBe("Moreno 555, Mar del Plata, Argentina");
  });

  it('should reconstruct correctly if only Argentina is present', () => {
    expect(formatAddressForMarDelPlata("Av. Luro 3245, Argentina")).toBe("Av. Luro 3245, Mar del Plata, Argentina");
  });
  
  it('should reconstruct correctly if only Argentina (with different casing) is present', () => {
    expect(formatAddressForMarDelPlata(" Av. Luro 3245, ARGENTINA  ")).toBe("Av. Luro 3245, Mar del Plata, Argentina");
  });

  it('should return the normalized address if both Mar del Plata and Argentina are present and correctly ordered', () => {
    expect(formatAddressForMarDelPlata("San Martín 800, Mar del Plata, Argentina")).toBe("San Martín 800, Mar del Plata, Argentina");
  });
  
  it('should normalize if both present but with different casing or spacing', () => {
    expect(formatAddressForMarDelPlata("San Martín 800,mar del plata,argentina")).toBe("San Martín 800, Mar del Plata, Argentina");
  });

  it('should handle addresses that contain the keywords as part of a larger segment correctly', () => {
    // This case assumes "Barrio Mar del Plata Sur" is part of the main address, not a suffix to be replaced.
    expect(formatAddressForMarDelPlata("Calle Falsa 123, Barrio Mar del Plata Sur")).toBe("Calle Falsa 123, Barrio Mar del Plata Sur, Mar del Plata, Argentina");
  });
  
  it('should handle empty string input', () => {
    expect(formatAddressForMarDelPlata("")).toBe("Mar del Plata, Argentina");
  });

  it('should handle input that is just "Mar del Plata"', () => {
    expect(formatAddressForMarDelPlata("Mar del Plata")).toBe("Mar del Plata, Argentina");
  });
  
  it('should handle input that is just "mar del plata" (lowercase)', () => {
    expect(formatAddressForMarDelPlata("mar del plata")).toBe("Mar del Plata, Argentina");
  });

  it('should handle input that is just "Argentina"', () => {
    expect(formatAddressForMarDelPlata("Argentina")).toBe("Mar del Plata, Argentina");
  });
   it('should handle input that is just "argentina" (lowercase)', () => {
    expect(formatAddressForMarDelPlata("argentina")).toBe("Mar del Plata, Argentina");
  });

  it('should handle extra spaces around keywords and mixed casing', () => {
    expect(formatAddressForMarDelPlata("  belgrano 123 , MAR DEL PLATA  ")).toBe("belgrano 123, Mar del Plata, Argentina");
  });
  
  it('should handle address with multiple commas correctly, cleaning empty parts', () => {
    expect(formatAddressForMarDelPlata("Plaza Mitre, , MdP")).toBe("Plaza Mitre, MdP, Mar del Plata, Argentina");
    expect(formatAddressForMarDelPlata("Plaza Mitre,, Mar del Plata")).toBe("Plaza Mitre, Mar del Plata, Argentina");
  });

  it('should handle an address that has Argentina then Mar del Plata incorrectly ordered', () => {
    expect(formatAddressForMarDelPlata("Independencia 123, Argentina, Mar del Plata")).toBe("Independencia 123, Mar del Plata, Argentina");
  });
  
  it('should handle an address that has only "Mar del Plata" and extra parts', () => {
    expect(formatAddressForMarDelPlata("Zona Puerto, Mar del Plata")).toBe("Zona Puerto, Mar del Plata, Argentina");
  });

  it('should handle an address that has only "Argentina" and extra parts', () => {
    expect(formatAddressForMarDelPlata("Zona Puerto, Argentina")).toBe("Zona Puerto, Mar del Plata, Argentina");
  });
});
