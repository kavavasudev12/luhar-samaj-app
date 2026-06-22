// // backend/services/pdf-service.js
// const PDFDocument = require('pdfkit');
// const fs = require('fs');
// const path = require('path');
// const Member = require('../models/Member');
// const Zone = require('../models/Zone');

// async function generateCard(memberId) {
//   const member = await Member.findById(memberId).populate('zone');
//   if (!member) throw new Error('Member not found');

//   const doc = new PDFDocument({
//     size: 'A4',
//     margin: 0
//   });

//   // Load fonts
//   const regularFont = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Regular.ttf');
//   const boldFont = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Bold.ttf');

//   doc.registerFont('Gujarati-Regular', regularFont);
//   doc.registerFont('Gujarati-Bold', boldFont);

//   // Draw template image
//   const templatePath = path.join(__dirname, '../assets/templates/card_template.png');
//   if (fs.existsSync(templatePath)) {
//     doc.image(templatePath, 0, 0, { width: doc.page.width, height: doc.page.height });
//   }

//   // Name (Big Red)
//   doc.font('Gujarati-Bold')
//      .fontSize(45)
//      .fillColor('red')
//      .text(member.headName || '', 30, 900);

//   // Address
//   doc.font('Gujarati-Regular')
//      .fontSize(35)
//      .fillColor('black')
//      .text(member.address || '', 30, 840);

//   // Mobile
//   doc.font('Gujarati-Regular')
//      .fontSize(35)
//      .fillColor('red')
//      .text(member.mobile || '', 30, 780);

//   // Zone
//   doc.font('Gujarati-Regular')
//      .fontSize(35)
//      .fillColor('blue')
//      .text(member.zone?.name || '', 560, 670);

//   // Family members
//   let y = 500;
//   if (member.familyMembers.length > 0) {
//     member.familyMembers.slice(0, 9).forEach(fm => {
//       doc.font('Gujarati-Regular')
//          .fontSize(35)
//          .fillColor('purple')
//          .text(fm.name, 20, y);

//       doc.text(fm.relation, 690, y);
//       y -= 50;
//     });
//   } else {
//     doc.font('Gujarati-Regular')
//        .fontSize(35)
//        .fillColor('purple')
//        .text('કોઈ સભ્યો મળ્યાં નથી', 20, 500);
//   }

//   // Return PDF as Buffer
//   return new Promise((resolve, reject) => {
//     const chunks = [];
//     doc.on('data', chunk => chunks.push(chunk));
//     doc.on('end', () => resolve(Buffer.concat(chunks)));
//     doc.on('error', reject);
//     doc.end();
//   });
// }

// module.exports = { generateCard };
