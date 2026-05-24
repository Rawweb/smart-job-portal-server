import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export const parseResume = async (buffer, mimetype) => {
  try {
    if (
      mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      // mammoth.extractRawText accepts { buffer } directly
      const result = await mammoth.extractRawText({ buffer });
      return result.value; // returns plain text string
    }

    if (mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });

      try {
        const result = await parser.getText();
        return result.text;
      } finally {
        await parser.destroy();
      }
    }

    return '';
  } catch (error) {
    console.error('Resume parse error:', error.message);
    return '';
  }
};
