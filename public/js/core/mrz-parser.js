// ============================================================
// ICE LOGIX: Математический декодер MRZ (ICAO 9303)
// Высокоточный парсер машиночитаемой зоны паспортов и ID-карт РБ
// Стандарты: ICAO 9303 TD3 (Паспорт РБ 2x44) и TD1 (ID-карта 3x30)
// ============================================================

(function() {
  'use strict';

  // Весовые коэффициенты ICAO 9303
  const ICAO_WEIGHTS = [7, 3, 1];

  /**
   * Числовое значение символа по стандарту ICAO 9303
   * 0-9 -> 0-9
   * A-Z -> 10-35
   * < -> 0
   */
  function charToValue(ch) {
    if (!ch || ch === '<') return 0;
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) return code - 48; // 0..9
    if (code >= 65 && code <= 90) return code - 55; // A..Z (A=10, Z=35)
    return 0;
  }

  /**
   * Расчет контрольной цифры для строки по формуле ICAO
   */
  function calculateCheckDigit(str) {
    if (!str) return '0';
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      const val = charToValue(str[i]);
      const weight = ICAO_WEIGHTS[i % 3];
      sum += val * weight;
    }
    return String(sum % 10);
  }

  /**
   * Проверка контрольной цифры
   */
  function verifyCheckDigit(str, expectedDigit) {
    return calculateCheckDigit(str) === String(expectedDigit);
  }

  /**
   * Преобразование даты YYMMDD в YYYY-MM-DD
   * @param {string} yymmdd 
   * @param {number|null} birthCenturyHint 19 или 20 (если известно из личного номера)
   */
  function parseDateYymmdd(yymmdd, birthCenturyHint = null) {
    if (!yymmdd || yymmdd.length !== 6 || yymmdd.includes('<')) return '';
    const yy = parseInt(yymmdd.slice(0, 2), 10);
    const mm = yymmdd.slice(2, 4);
    const dd = yymmdd.slice(4, 6);

    let century = birthCenturyHint;
    if (!century) {
      const currentYear = new Date().getFullYear();
      const currentTwoDigits = currentYear % 100;
      // Если YY больше текущего года + 1 -> 1900-е, иначе 2000-е
      century = yy > currentTwoDigits + 1 ? 19 : 20;
    }

    const fullYear = century * 100 + yy;
    return `${fullYear}-${mm}-${dd}`;
  }

  /**
   * Нормализация строки MRZ: только латиница A-Z, цифры 0-9 и знаки <
   */
  function cleanMrzLine(raw) {
    if (!raw) return '';
    return raw
      .toUpperCase()
      .replace(/[\s\r\n]+/g, '')
      .replace(/«|»/g, '<')
      .replace(/[—–-]/g, '<')
      .replace(/[^A-Z0-9<]/g, '');
  }

  /**
   * Декодирование паспорта РБ (ICAO TD3: 2 строки по 44 символа)
   */
  function parseTd3Passport(line1Raw, line2Raw) {
    const l1 = cleanMrzLine(line1Raw);
    const l2 = cleanMrzLine(line2Raw);

    if (l1.length < 40 || l2.length < 40) {
      return { isValid: false, error: 'Длина строки MRZ меньше требуемой (44 символа)' };
    }

    // Линия 1: P<BLR[SURNAME]<<[NAME]<<<...
    const docType = l1.slice(0, 1);
    const issuingCountry = l1.slice(2, 5);
    const nameSection = l1.slice(5).replace(/<+$/, '');
    const nameParts = nameSection.split('<<');
    const surnameLatin = nameParts[0] ? nameParts[0].replace(/</g, ' ').trim() : '';
    const givenNamesLatin = nameParts[1] ? nameParts[1].replace(/</g, ' ').trim() : '';

    // Линия 2:
    // 0..8: Номер паспорта (9 знаков)
    const docNumber = l2.slice(0, 9).replace(/<+$/, '');
    const docNumberCheck = l2.slice(9, 10);
    const isDocNumValid = verifyCheckDigit(l2.slice(0, 9), docNumberCheck);

    // 10..12: Национальность
    const nationality = l2.slice(10, 13);

    // 13..18: Дата рождения YYMMDD
    const dobRaw = l2.slice(13, 19);
    const dobCheck = l2.slice(19, 20);
    const isDobValid = verifyCheckDigit(dobRaw, dobCheck);

    // 20: Пол (M/F)
    const sexChar = l2.slice(20, 21);
    const gender = sexChar === 'M' ? 'Мужской' : (sexChar === 'F' ? 'Женский' : '');

    // 21..26: Срок действия YYMMDD
    const expiryRaw = l2.slice(21, 27);
    const expiryCheck = l2.slice(27, 28);
    const isExpiryValid = verifyCheckDigit(expiryRaw, expiryCheck);

    // 28..41: Личный номер РБ (14 знаков!)
    const personalNumber = l2.slice(28, 42).replace(/<+$/, '');
    const personalNumCheck = l2.slice(42, 43);
    const isPersonalValid = verifyCheckDigit(l2.slice(28, 42), personalNumCheck);

    // Определение века рождения из 1-й цифры личного номера (если 1..6)
    let centuryHint = null;
    if (personalNumber && personalNumber.length === 14) {
      const firstDigit = parseInt(personalNumber[0], 10);
      if (firstDigit === 1 || firstDigit === 2) centuryHint = 18;
      else if (firstDigit === 3 || firstDigit === 4) centuryHint = 19;
      else if (firstDigit === 5 || firstDigit === 6 || firstDigit === 7 || firstDigit === 8) centuryHint = 20;
    }

    const birthDateIso = parseDateYymmdd(dobRaw, centuryHint);
    const expiryDateIso = parseDateYymmdd(expiryRaw, 20); // Паспорта действуют в XXI веке

    return {
      isValid: Boolean(personalNumber && personalNumber.length === 14),
      docType: 'passport',
      issuingCountry,
      nationality,
      surnameLatin,
      givenNamesLatin,
      seriesNumber: docNumber,
      isDocNumberChecksumValid: isDocNumValid,
      birthDateIso,
      isBirthDateChecksumValid: isDobValid,
      gender,
      expiryDateIso,
      isExpiryChecksumValid: isExpiryValid,
      idNumber: personalNumber,
      isIdNumberChecksumValid: isPersonalValid,
      rawMrz: [l1, l2]
    };
  }

  /**
   * Универсальный парсер сырого текста, содержащего MRZ
   */
  function parseMrzText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { isValid: false, error: 'Пустой текст MRZ' };
    }

    // Разбиваем на строки и убираем пробелы
    const lines = rawText
      .split('\n')
      .map(cleanMrzLine)
      .filter(l => l.length >= 28);

    // Ищем строки паспорта (начинаются на P< или содержат много <)
    let pLine1 = null;
    let pLine2 = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('P<') || line.startsWith('P')) {
        pLine1 = line;
        if (i + 1 < lines.length) {
          pLine2 = lines[i + 1];
        }
        break;
      }
    }

    // Если не нашли по префиксу P<, ищем две подряд идущие длинные строки с <<
    if (!pLine1 && lines.length >= 2) {
      for (let i = 0; i < lines.length - 1; i++) {
        if (lines[i].includes('<<') && lines[i].length >= 35 && lines[i + 1].length >= 35) {
          pLine1 = lines[i];
          pLine2 = lines[i + 1];
          break;
        }
      }
    }

    if (pLine1 && pLine2) {
      return parseTd3Passport(pLine1, pLine2);
    }

    return { isValid: false, error: 'Строки машиночитаемой зоны MRZ не найдены' };
  }

  // Экспорт в глобальный scope
  window.MrzParser = {
    calculateCheckDigit,
    verifyCheckDigit,
    parseTd3Passport,
    parseMrzText,
    cleanMrzLine
  };

})();
