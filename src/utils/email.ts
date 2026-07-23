import nodemailer from "nodemailer";
import { config } from "../config/env";

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
}

export const sendEmail = async (options: EmailOptions) => {
  const transporter = nodemailer.createTransport({
    host: config.emailHost,
    port: parseInt(config.emailPort as string, 10),
    auth: {
      user: config.emailUsername,
      pass: config.emailPassword,
    },
  });

  const mailOptions = {
    from: "Admin <hello@your-app.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};
