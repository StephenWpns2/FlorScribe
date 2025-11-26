import { Injectable } from '@nestjs/common';

export interface RedactionOptions {
  redactNames?: boolean;
  redactDates?: boolean;
  redactPhone?: boolean;
  redactEmail?: boolean;
  redactSSN?: boolean;
  redactAddress?: boolean;
  customPatterns?: Array<{ pattern: RegExp; replacement: string }>;
}

export interface RedactedItem {
  type: string;
  value: string;
  position?: { start: number; end: number };
}

@Injectable()
export class RedactionService {
  // Patterns for common PHI
  private readonly patterns = {
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    date: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    // Address patterns (basic)
    zipCode: /\b\d{5}(-\d{4})?\b/g,
  };

  /**
   * Redact PHI from text using pattern matching
   */
  redactText(
    text: string,
    options?: RedactionOptions,
  ): { redactedText: string; redactedItems: RedactedItem[] } {
    if (!text) {
      return { redactedText: '', redactedItems: [] };
    }

    let redactedText = text;
    const redactedItems: RedactedItem[] = [];

    const opts: RedactionOptions = {
      redactNames: true,
      redactDates: false, // Be careful with dates - might be medical dates
      redactPhone: true,
      redactEmail: true,
      redactSSN: true,
      redactAddress: false,
      ...options,
    };

    // Redact SSN
    if (opts.redactSSN) {
      redactedText = redactedText.replace(this.patterns.ssn, (match, offset) => {
        redactedItems.push({
          type: 'SSN',
          value: match,
          position: { start: offset, end: offset + match.length },
        });
        return '[REDACTED-SSN]';
      });
    }

    // Redact phone numbers
    if (opts.redactPhone) {
      redactedText = redactedText.replace(this.patterns.phone, (match, offset) => {
        redactedItems.push({
          type: 'PHONE',
          value: match,
          position: { start: offset, end: offset + match.length },
        });
        return '[REDACTED-PHONE]';
      });
    }

    // Redact emails
    if (opts.redactEmail) {
      redactedText = redactedText.replace(this.patterns.email, (match, offset) => {
        redactedItems.push({
          type: 'EMAIL',
          value: match,
          position: { start: offset, end: offset + match.length },
        });
        return '[REDACTED-EMAIL]';
      });
    }

    // Redact dates (be careful - might redact medical dates)
    if (opts.redactDates) {
      redactedText = redactedText.replace(this.patterns.date, (match, offset) => {
        redactedItems.push({
          type: 'DATE',
          value: match,
          position: { start: offset, end: offset + match.length },
        });
        return '[REDACTED-DATE]';
      });
    }

    // Redact zip codes (part of address)
    if (opts.redactAddress) {
      redactedText = redactedText.replace(this.patterns.zipCode, (match, offset) => {
        redactedItems.push({
          type: 'ZIP_CODE',
          value: match,
          position: { start: offset, end: offset + match.length },
        });
        return '[REDACTED-ZIP]';
      });
    }

    // Custom patterns
    if (opts.customPatterns) {
      opts.customPatterns.forEach(({ pattern, replacement }) => {
        redactedText = redactedText.replace(pattern, (match, offset) => {
          redactedItems.push({
            type: 'CUSTOM',
            value: match,
            position: { start: offset, end: offset + match.length },
          });
          return replacement;
        });
      });
    }

    return { redactedText, redactedItems };
  }

  /**
   * Redact patient names from text (requires patient data)
   */
  redactPatientNames(
    text: string,
    patient: { firstName: string; lastName: string },
  ): { redactedText: string; redactedItems: RedactedItem[] } {
    if (!text || !patient) {
      return { redactedText: text || '', redactedItems: [] };
    }

    let redacted = text;
    const redactedItems: RedactedItem[] = [];
    const fullName = `${patient.firstName} ${patient.lastName}`;
    const firstName = patient.firstName;
    const lastName = patient.lastName;

    // Redact full name
    const fullNameRegex = new RegExp(fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    redacted = redacted.replace(fullNameRegex, (match, offset) => {
      redactedItems.push({
        type: 'PATIENT_NAME',
        value: match,
        position: { start: offset, end: offset + match.length },
      });
      return '[PATIENT-NAME]';
    });

    // Redact first name (as standalone word)
    const firstNameRegex = new RegExp(`\\b${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    redacted = redacted.replace(firstNameRegex, (match, offset) => {
      // Check if not already redacted as part of full name
      const alreadyRedacted = redactedItems.some(
        (item) =>
          item.type === 'PATIENT_NAME' &&
          item.position &&
          offset >= item.position.start &&
          offset < item.position.end,
      );
      if (!alreadyRedacted) {
        redactedItems.push({
          type: 'PATIENT_FIRST_NAME',
          value: match,
          position: { start: offset, end: offset + match.length },
        });
      }
      return '[PATIENT-FIRST-NAME]';
    });

    // Redact last name (as standalone word)
    const lastNameRegex = new RegExp(`\\b${lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    redacted = redacted.replace(lastNameRegex, (match, offset) => {
      // Check if not already redacted as part of full name
      const alreadyRedacted = redactedItems.some(
        (item) =>
          item.type === 'PATIENT_NAME' &&
          item.position &&
          offset >= item.position.start &&
          offset < item.position.end,
      );
      if (!alreadyRedacted) {
        redactedItems.push({
          type: 'PATIENT_LAST_NAME',
          value: match,
          position: { start: offset, end: offset + match.length },
        });
      }
      return '[PATIENT-LAST-NAME]';
    });

    return { redactedText: redacted, redactedItems };
  }

  /**
   * Comprehensive redaction combining patient name redaction with pattern-based redaction
   */
  redactComprehensive(
    text: string,
    patient?: { firstName: string; lastName: string },
    options?: RedactionOptions,
  ): { redactedText: string; redactedItems: RedactedItem[] } {
    let redactedText = text;
    let allRedactedItems: RedactedItem[] = [];

    // First, redact patient names if patient data is provided
    if (patient) {
      const nameResult = this.redactPatientNames(redactedText, patient);
      redactedText = nameResult.redactedText;
      allRedactedItems = [...nameResult.redactedItems];
    }

    // Then apply pattern-based redaction
    const patternResult = this.redactText(redactedText, options);
    redactedText = patternResult.redactedText;
    allRedactedItems = [...allRedactedItems, ...patternResult.redactedItems];

    return { redactedText, redactedItems: allRedactedItems };
  }
}

