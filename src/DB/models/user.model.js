import { model, Schema } from "mongoose";
const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 20,
      trim: true,
      lowercase: true,
    },
    lastName: {
      type: String,
      required: true,
      minLength: 3,
      maxLength: 20,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: function () {
        if (this.phone) {
          return false; // Email is not required if phone is provided
        }
        return true; // Email is required if phone is not provided
      },
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: function () { if (this.userAgent =="google"){return false;} return true; }, trim: true },
    phone: {
      type: String,
      required: function () {
        if (this.email) {
          return false; // Phone is not required if email is provided
        }
        return true; // Phone is required if email is not provided
      },
      trim: true,
    },
    profilePicture: { type: String},
    dob: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
    otp: { type: Number },
    userAgent: { type: String,
      enum:["local",'google'],
      default: "local"
     },
    otpExpiration: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, toObject: { virtuals: true }, toJSON: { virtuals: true } }
);

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});
userSchema.virtual("fullName").set(function (name) {
  const parts = name.split(" ");
  this.firstName = parts[0];
  this.lastName = parts.slice(1).join(" ");
});

userSchema.virtual("age").get(function () {
  const today = new Date();

  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

export const User = model("User", userSchema);
