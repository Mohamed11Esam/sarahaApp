import joi from "joi"

export const registerSchema = joi.object({
      firstName: joi.string().min(2).max(100).required(),
      lastName: joi.string().min(2).max(100).required(),
      email: joi.string().email(),
      password: joi.string().min(6).required(),
      phone: joi.string().min(10).max(15),
      dob: joi.date().less("now"),
    }).or("email", "phone");

export const loginSchema = joi.object({
    email: joi.string().email(),
    password: joi.string().min(6).required(),
    phone: joi.string().min(10).max(15),
}).or("email", "phone");
