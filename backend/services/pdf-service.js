const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const Member = require('../models/Member');
const QRCode = require('qrcode');

/**
 * Detect if text contains Gujarati characters
 */
function isGujarati(text = '') {
  return /[\u0A80-\u0AFF]/.test(text);
}

/**
 * Fit text in a given rectangle by shrinking font size if needed
 * (Corrected version: removes manual x-centering to let 'align' option work)
 */
function fitText(doc, text, font, color, initialSize, x1, y1, x2, y2, align = 'left') {
  if (!text) return;

  const boxWidth = x2 - x1;
  const boxHeight = y2 - y1;
  let fontSize = initialSize;

  try {
    doc.font(font);
  } catch (e) {
    doc.font('Helvetica');
  }
  doc.fillColor(color).fontSize(fontSize);

  // Shrink font size if needed
  // Use a reasonable absolute minimum font size (e.g., 4pt) for the new small canvas
  while (doc.widthOfString(text) > boxWidth && fontSize > 4) {
    fontSize -= 0.5; // Use smaller steps for finer control
    doc.fontSize(fontSize);
  }

  const textHeight = fontSize;
  
  // Calculate vertical center
  const textY = y1 + (boxHeight - textHeight) / 2;
  
  // Always start at the left edge (x1)
  const textX = x1;

  // pdfkit will now handle the alignment correctly
  doc.text(text, textX, textY, {
    width: boxWidth,
    height: boxHeight,
    align: align 
  });
}

async function generateCard(memberId) {
  try {
    const member = await Member.findById(memberId).populate('zone');
    if (!member) throw new Error('Member not found');

    const templatePath = path.join(__dirname, '../assets/templates/card_template.png');
    const stampPath = path.join(__dirname, '../assets/stamps/org_stamp.png');
    const fontRegular = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Regular.ttf');
    const fontBold = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Bold.ttf');

    if (!fs.existsSync(fontRegular) || !fs.existsSync(fontBold)) {
      throw new Error("Gujarati fonts not found in assets/fonts/ — add NotoSansGujarati-Regular.ttf & Bold.ttf");
    }

    // --- NEW DIMENSIONS & SCALING ---
    // 1 inch = 72 points (pdfkit's default unit)
    const newWidth = 3.37 * 72; // 242.64 pt
    const newHeight = 4.26 * 72; // 306.72 pt
    const oldWidth = 900;
    const oldHeight = 1200;

    // Scaling functions to convert old coordinates to new coordinates
    const sx = (val) => (val / oldWidth) * newWidth;   // Scale X coordinates and widths
    const sy = (val) => (val / oldHeight) * newHeight; // Scale Y coordinates and heights
    const sFont = (val) => sy(val); // Scale font sizes (as they are heights)
    // Use 'sy' for square items to fit vertically (it's the smaller factor)
    const sSquare = (val) => sy(val); 
    // --- END NEW ---

    const doc = new PDFDocument({ size: [newWidth, newHeight], margin: 0 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    doc.registerFont('regular', fontRegular);
    doc.registerFont('bold', fontBold);
    
    // Scale template image to fit new dimensions
    doc.image(templatePath, 0, 0, { width: newWidth, height: newHeight });
    
    const stampSize = sSquare(270);
    doc.opacity(0.2).image(stampPath, sx(310), sy(250), { width: stampSize, height: stampSize }).opacity(1);
    doc.opacity(0.2).image(stampPath, sx(310), sy(750), { width: stampSize, height: stampSize }).opacity(1);

    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const qrData = `${baseUrl}/api/members/verify/${member.cardId || member._id}`;
    const qrImageBuffer = await QRCode.toBuffer(qrData, { width: 165, margin: 1 });
    const qrDrawSize = sSquare(165);
    doc.image(qrImageBuffer, sx(710), sy(250), { width: qrDrawSize, height: qrDrawSize });

    const registrationYear = member.createdAt ? new Date(member.createdAt).getFullYear() : '';
    doc.font('bold').fontSize(sFont(35)).fillColor('white').text(registrationYear, sx(780), sy(25));

    // --- MODIFICATION START ---
    // Print Unique Number and Zone in individual, fixed-position boxes
    
    // 1. Unique Number (Red)
    // This part is placed in a box from x=650 to x=795 and is right-aligned.
    
    const uniquePart = `${member.uniqueNumber || member.cardId || '---'}`; 
    
    fitText(doc, uniquePart, 'bold', 'red',
      sFont(36),      // initialSize
      sx(685), sy(465), // x1, y1
      sx(795), sy(535), // x2, y2 (This is 650 + 145)
      'center'          // align: right-align to meet the zone number
    );

    // 2. Zone Number (Blue)
    // This part is placed in a box from x=795 to x=885 and is left-aligned.
    const zonePart = `${member.zone?.number || ''}`; 
    
    fitText(doc, zonePart, 'bold', 'blue',
      sFont(36),      // initialSize
      sx(825), sy(465), // x1, y1 (Starts where the uniquePart box ends)
      sx(885), sy(535), // x2, y2 (Original end of the area)
      'center'          // align: left-align to meet the unique number
    );
    // --- MODIFICATION END ---

    let headFontSize = 55;
    if (!isGujarati(member.head?.name)) headFontSize -= 10;
    // Pass scaled values to fitText
    fitText(doc, member.head?.name || '', 'bold', 'red', 
      sFont(headFontSize), // initialSize
      sx(38), sy(230),     // x1, y1
      sx(738), sy(300),     // x2, y2
      'left'               // align
    );

    let addressFontSize = 26;
    if (!isGujarati(member.address)) addressFontSize -= 6;
    doc.font('regular').fontSize(sFont(addressFontSize)).fillColor('blue').text(member.address || '', sx(38), sy(315), { 
        width: sx(680), 
        height: sy(160), // Use 120, this is correct
        ellipsis: true, 
        align: 'left' 
    });

    // ...
    const city = member.city || '';
    const pincode = member.pincode || '';
    const cityPincode = [city, pincode].filter(Boolean).join(' - '); 

    doc.font('bold').fontSize(sFont(35)).fillColor('red').text(cityPincode, sx(38), sy(450), { width: sx(700) });
    
    doc.font('bold').fontSize(sFont(40)).fillColor('blue').text(`મો. : ${member.mobile || ''}`, sx(38), sy(491), { width: sx(800) });

    const family = member.familyMembers || [];
    for (let i = 0; i < Math.min(family.length, 8); i++) {
      const yPos = sy(685) + (i * sFont(50));
      const famMember = family[i];

      if (!famMember) continue;

      let famFontSize = 35;
      if (!isGujarati(famMember.name) || !isGujarati(famMember.relation)) famFontSize -= 6;
      
      doc.font('regular').fontSize(sFont(famFontSize)).fillColor('purple').text(`${i + 1}    ${famMember.name}`, sx(25), yPos, { width: sx(600), ellipsis: true });
      
      // --- MODIFICATION START: Split Relation and Age (Centered) ---
      // Relation: x=630 to x=730
      const relationX = sx(630);
      const relationWidth = sx(730) - relationX; 
      
      // Age: x=740 to x=780
      const ageX = sx(740);
      const ageWidth = sx(810) - ageX;

      // Set font style once for both
      doc.font('regular').fontSize(sFont(famFontSize)).fillColor('purple');

      // 1. Print Relation (Centered)
      const relationText = famMember.relation || '';
      doc.text(relationText, relationX, yPos, { 
          width: relationWidth, 
          align: 'center',
          ellipsis: true 
      });

      // 2. Print Age (Centered)
      const ageText = famMember.age ? `${famMember.age}` : '';
      doc.text(ageText, ageX, yPos, { 
          width: ageWidth, 
          align: 'center',
          ellipsis: true 
      });
      // --- MODIFICATION END ---
    }

    // --- MODIFICATION START: Vertical Issue Date (Reads Top-to-Bottom When Card is Rotated) ---
    const issueDateFormatted = new Date(member.issueDate).toLocaleDateString('en-GB');
    const issueDateText = `Date of Issue: ${issueDateFormatted}`;
    const issueDateX = sx(850); // X coordinate
    const issueDateY = sy(1070); // Y coordinate (adjusted to start higher)

    doc.save(); // Save the state

    doc.font('bold').fontSize(sFont(35)).fillColor('blue'); // Set text style

    // Translate to the starting position, then rotate -90 degrees
    doc.translate(issueDateX, issueDateY);
    doc.rotate(-90);
    
    // Draw the text at origin (0, 0) after transformation
    doc.text(issueDateText, 0, 0);

    doc.restore(); // Restore the state to horizontal
    // --- MODIFICATION END ---

    doc.end();
    return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}

/**
 * NEW FUNCTION: Creates a printable sheet of address stickers for a zone.
 * (This function is unchanged as it uses 'A4' size, not the card template)
 */
async function generateZoneStickers(members) {
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    const fontRegular = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Regular.ttf');
    const fontBold = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Bold.ttf');
    if (!fs.existsSync(fontRegular) || !fs.existsSync(fontBold)) {
      throw new Error("Gujarati fonts not found in assets/fonts/");
    }
    doc.registerFont('regular', fontRegular);
    doc.registerFont('bold', fontBold);

    const pageMargin = 40;
    const stickerWidth = 170;
    const stickerHeight = 80;
    const gapX = 20;
    const gapY = 20;
    let currentX = pageMargin;
    let currentY = pageMargin;

    for (const member of members) {
      if (currentX + stickerWidth > doc.page.width - pageMargin) {
        currentX = pageMargin;
        currentY += stickerHeight + gapY;
      }
      if (currentY + stickerHeight > doc.page.height - pageMargin) {
        doc.addPage();
        currentX = pageMargin;
        currentY = pageMargin;
      }

      const textPadding = 5;
      const textWidth = stickerWidth - (textPadding * 2);
      doc.rect(currentX, currentY, stickerWidth, stickerHeight).stroke();
      doc.font('bold').fontSize(12).text(member.head.name, currentX + textPadding, currentY + textPadding, { width: textWidth });
      
      // Combine address, city, pincode for sticker
      const cityPincode = [member.city, member.pincode].filter(Boolean).join(' - ');
      const fullAddress = [member.address, cityPincode].filter(Boolean).join(', ');
      
      doc.font('regular').fontSize(9).text(fullAddress, doc.x, doc.y, { width: textWidth, ellipsis: true });
      
      const zoneText = `Zone: ${member.zone.number} - ${member.zone.name}`;
      // Position zone text at the bottom of the sticker
      doc.font('regular').fontSize(8).text(zoneText, currentX + textPadding, currentY + stickerHeight - 15, { width: textWidth });

      currentX += stickerWidth + gapX;
    }

    doc.end();
    return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
    });
  } catch (error) {
    console.error('Sticker sheet generation error:', error);
    throw error;
  }
}

// Export both functions so the app can use them.
module.exports = { generateCard, generateZoneStickers };