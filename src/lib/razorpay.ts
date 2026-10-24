import Razorpay from "razorpay";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_live_Tm5fsJVpQaPb5t",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rz1yehvDItfIvKtgc9J60xVN",
});
