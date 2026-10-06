export const BUY_ME_A_COFFEE_URL = "https://www.buymeacoffee.com/bhattrishuu";
export const GITHUB_REPO_URL = "https://github.com/rishibhatt/APIForge";
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;

export const UPI_ID = "bhattrishu07-1@oksbi";
const UPI_PAYEE_NAME = "Rishi Bhatt";
export const UPI_URI = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&cu=INR`;
export const UPI_QR_IMG_URL = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(UPI_URI)}`;
