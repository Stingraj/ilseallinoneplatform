// Email validation regex (RFC 5322 compatible for standard email formats)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Parse pasted text string with emails separated by newlines, commas, or semicolons.
 */
export function parsePastedEmails(text, existingContacts = []) {
  if (!text || typeof text !== 'string') return { contacts: existingContacts, addedCount: 0 };

  // Split by newline, comma, semicolon
  const tokens = text.split(/[\r\n,;]+/);
  const seenEmails = new Set(existingContacts.map(c => c.email.toLowerCase()));
  const newContacts = [];

  for (let token of tokens) {
    let raw = token.trim();
    if (!raw) continue;

    let contactName = '';
    let emailCandidate = raw;

    // Check for "Name <email@example.com>" format
    const angleMatch = raw.match(/^(.*?)\s*<([^>]+)>$/);
    if (angleMatch) {
      contactName = angleMatch[1].replace(/^["']|["']$/g, '').trim();
      emailCandidate = angleMatch[2].trim();
    }

    const cleaned = emailCandidate.toLowerCase();
    if (!cleaned) continue;

    if (!seenEmails.has(cleaned)) {
      seenEmails.add(cleaned);
      const valid = isValidEmail(cleaned);
      newContacts.push({
        id: 'c_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
        email: cleaned,
        name: contactName || cleaned.split('@')[0] || '',
        isValid: valid,
        error: valid ? null : getEmailError(cleaned)
      });
    }
  }

  return {
    contacts: [...existingContacts, ...newContacts],
    addedCount: newContacts.length
  };
}

function getEmailError(email) {
  if (!email.includes('@')) return 'Missing @ symbol';
  const parts = email.split('@');
  if (parts.length > 2) return 'Multiple @ symbols';
  if (!parts[0]) return 'Missing username';
  if (!parts[1]) return 'Missing domain';
  if (!parts[1].includes('.')) return 'Invalid domain extension';
  return 'Invalid format';
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line, delimiter) {
  const values = [];
  let current = '';
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === delimiter && !insideQuote) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * Detect delimiter: comma, semicolon, tab
 */
function detectDelimiter(firstLine) {
  const counts = {
    ',': (firstLine.match(/,/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length,
  };
  let best = ',';
  let max = counts[','];
  for (const [delim, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      best = delim;
    }
  }
  return best;
}

/**
 * Parse CSV file content client-side
 */
export function analyzeCSV(fileContent) {
  const lines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { columns: [], rows: [], delimiter: ',', totalRows: 0 };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerCandidates = parseCSVLine(lines[0], delimiter);
  
  // Check if first line is a header
  const hasHeader = headerCandidates.some(col => 
    /email|e-mail|mail|contact|recipient|address|name|company|phone/i.test(col)
  );

  let columns = [];
  let dataStartIndex = 0;

  if (hasHeader) {
    columns = headerCandidates.map(c => c.replace(/^["']|["']$/g, '').trim());
    dataStartIndex = 1;
  } else {
    // Generate default column names Col 1, Col 2, etc.
    columns = headerCandidates.map((_, idx) => `Column ${idx + 1}`);
    dataStartIndex = 0;
  }

  const rows = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter);
    if (row.some(val => val.trim())) {
      rows.push(row);
    }
  }

  // Detect which column is most likely email
  let detectedColumnIndex = -1;
  
  // 1. Look for column name containing 'email'
  const emailColNameIndex = columns.findIndex(col => /email|e-mail|mail/i.test(col));
  if (emailColNameIndex !== -1) {
    detectedColumnIndex = emailColNameIndex;
  } else {
    // 2. Sample first 10 rows and check for '@'
    const sampleSize = Math.min(rows.length, 10);
    const colScores = new Array(columns.length).fill(0);
    for (let r = 0; r < sampleSize; r++) {
      for (let c = 0; c < columns.length; c++) {
        if (rows[r][c] && isValidEmail(rows[r][c])) {
          colScores[c]++;
        }
      }
    }
    const maxScore = Math.max(...colScores);
    if (maxScore > 0) {
      detectedColumnIndex = colScores.indexOf(maxScore);
    } else {
      detectedColumnIndex = 0; // Default to first column
    }
  }

  // Detect name column if available
  const detectedNameColumnIndex = columns.findIndex(col => /^(full_?name|name|first_?name|recipient_?name|contact_?name)$/i.test(col));

  return {
    columns,
    detectedColumnIndex,
    detectedNameColumnIndex,
    rows,
    totalRows: rows.length
  };
}

/**
 * Import contacts from CSV rows using a specific column index
 */
export function importFromCSVRows(rows, columnIndex, existingContacts = [], nameColumnIndex = -1) {
  const seenEmails = new Set(existingContacts.map(c => c.email.toLowerCase()));
  const newContacts = [];

  for (const row of rows) {
    const rawVal = row[columnIndex];
    if (!rawVal) continue;
    const cleaned = rawVal.trim().replace(/^["']|["']$/g, '').toLowerCase();
    if (!cleaned) continue;

    let contactName = '';
    if (nameColumnIndex >= 0 && row[nameColumnIndex]) {
      contactName = row[nameColumnIndex].trim().replace(/^["']|["']$/g, '');
    }

    if (!seenEmails.has(cleaned)) {
      seenEmails.add(cleaned);
      const valid = isValidEmail(cleaned);
      newContacts.push({
        id: 'c_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
        email: cleaned,
        name: contactName || cleaned.split('@')[0] || '',
        isValid: valid,
        error: valid ? null : getEmailError(cleaned)
      });
    }
  }

  return {
    contacts: [...existingContacts, ...newContacts],
    addedCount: newContacts.length
  };
}
