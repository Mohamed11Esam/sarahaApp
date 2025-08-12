import nodemailer from "nodemailer";

export async function sendMail({ to, subject, html }) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  await transporter.sendMail({
    from: `'sarahaApp'<${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
