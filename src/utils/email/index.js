import nodemailer from "nodemailer";

export async function sendMail({ to, subject, html }) {
  let transporter;
  let testAccount;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Fallback to Ethereal test account for development when credentials are missing
    testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.warn(
      "EMAIL_USER/EMAIL_PASS not set — using Ethereal test account for outgoing mail (development only)"
    );
  }

  const info = await transporter.sendMail({
    from: `'sarahaApp'<${
      process.env.EMAIL_USER || (testAccount && testAccount.user)
    }>`,
    to,
    subject,
    html,
  });

  // If using Ethereal, log preview URL
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) console.log("Preview email URL:", preview);
}
