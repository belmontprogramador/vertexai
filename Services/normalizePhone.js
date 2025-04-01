// utils/normalizePhone.js
function normalizePhone(phone) {
    if (!phone.startsWith('+')) {
      return `+${phone}`;
    }
    return phone;
  }
  
  module.exports = { normalizePhone };
  