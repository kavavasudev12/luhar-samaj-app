import jsPDF from "jspdf";

export function generateStickersPDF(people) {
  const doc = new jsPDF("p", "mm", "a4");

  const pageWidth = 210;   // A4 width in mm
  const pageHeight = 297;  // A4 height in mm
  const cols = 3;          // 3 stickers across
  const rows = 4;          // 4 stickers down (12 total per page)

  const stickerWidth = pageWidth / cols;
  const stickerHeight = pageHeight / rows;

  let count = 0;

  people.forEach((person, index) => {
    const col = count % cols;
    const row = Math.floor(count / cols);

    const x = col * stickerWidth + 5;  // margin
    const y = row * stickerHeight + 10;

    // Draw border (optional)
    doc.rect(col * stickerWidth, row * stickerHeight, stickerWidth, stickerHeight);

    // Sticker content
    doc.setFontSize(12);
    doc.text(person.name || "No Name", x, y);
    doc.setFontSize(10);
    doc.text(person.address || "No Address", x, y + 8);
    doc.text("📞 " + (person.mobile || "No Number"), x, y + 16);

    count++;

    // If 12 stickers filled, add new page
    if (count === 12 && index < people.length - 1) {
      doc.addPage();
      count = 0;
    }
  });

  doc.save("stickers.pdf");
}
