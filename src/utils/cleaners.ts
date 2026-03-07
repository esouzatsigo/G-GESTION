/**
 * Limpia un string de caracteres de control invisibles, BOM, zero-width spaces, 
 * y otros caracteres espurios, preservando acentos, eñes y caracteres imprimibles válidos.
 */
export const cleanString = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);

    return str
        // Elimina Byte Order Mark (BOM) y Zero-width spaces
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        // Elimina caracteres de control ASCII (\x00-\x08, \x0B, \x0C, \x0E-\x1F, \x7F)
        // Mantiene \n y \r si fueran necesarios
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Elimina el Replacement Character de Unicode (cuando falla el encoding)
        .replace(/\uFFFD/g, '')
        // Sustituir retornos de carro aislados por espacios (en caso de pegados raros)
        .replace(/\r/g, ' ')
        .trim();
};

/**
 * Recorre todas las propiedades de un objeto plano (como los creados al parsear CSV/XLSX) 
 * y aplica la limpieza rigurosa a sus llaves y valores de texto.
 */
export const cleanObject = <T extends Record<string, any>>(obj: T): T => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
    }

    const cleaned: any = {};
    for (const [key, val] of Object.entries(obj)) {
        // Limpiamos la llave también (a veces vienen encabezados con zero-width spaces)
        const cleanKey = cleanString(key);

        if (typeof val === 'string') {
            cleaned[cleanKey] = cleanString(val);
        } else if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            cleaned[cleanKey] = cleanObject(val);
        } else {
            cleaned[cleanKey] = val;
        }
    }
    return cleaned as T;
};
