const PDFDocument = require('pdfkit');
const env = require('../config/env');

const generateInvoiceBuffer = (order, user) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40 });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(18).text(env.business.name, { align: 'left' });
  doc.fontSize(10).text(env.business.address);
  doc.text(env.business.contact);
  doc.moveDown();

  doc.fontSize(16).text('Order Receipt');
  doc.moveDown();

  doc.fontSize(11);
  doc.text(`Order ID: ${order.orderCode}`);
  doc.text(`Customer: ${user.name}`);
  doc.text(`Email: ${user.email}`);
  doc.text(`Meal Date: ${new Date(order.mealDate).toLocaleDateString()}`);
  doc.text(`Slot: ${order.slot}`);
  doc.text(`Quantity: ${order.quantity}`);
  doc.text(`Fulfillment: ${order.fulfillmentType}`);
  if (order.addonItems?.length) {
    doc.moveDown(0.5);
    doc.text('Add-ons:');
    order.addonItems.forEach((addon) => {
      doc.text(`- ${addon.name} x ${addon.quantity} = INR ${Number(addon.total).toFixed(2)}`);
    });
  }
  doc.moveDown();

  doc.text(`Subtotal: INR ${order.subtotal.toFixed(2)}`);
  doc.text(`Discount: INR ${order.discountAmount.toFixed(2)}`);
  doc.text(`Total: INR ${order.totalAmount.toFixed(2)}`);
  doc.text(`Credits Used: INR ${order.walletUsed.toFixed(2)}`);
  doc.text(`Bank Paid: INR ${order.amountPaidOnline.toFixed(2)}`);
  doc.text(`Payment Status: ${order.paymentStatus}`);

  doc.end();
});

module.exports = {
  generateInvoiceBuffer
};
