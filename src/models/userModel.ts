import bcrypt from "bcryptjs";
import { Schema, model, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  role: "user" | "admin";
  password?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  active: boolean;
}

export interface IUserMethods extends Document {
  correctPassword(
    candidatePassword: string,
    userPassword: string,
  ): Promise<boolean>;

  changedPasswordAfter(JWTTimestamp: number): boolean;
}

const userSchema = new Schema<IUser, IUserMethods>(
  {
    name: {
      type: String,
      required: [true, "'Please tell us your name!'"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide your email!"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    password: {
      type: String,
      required: [true, "Please provide a password!"],
      select: false,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {},
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (
  JWTTimestamp: number,
): boolean {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      (this.passwordChangedAt.getTime() / 1000).toString(),
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }

  return false;
};
const User = model<IUser, Model<IUser, {}, IUserMethods>>("User", userSchema);
export default User;
